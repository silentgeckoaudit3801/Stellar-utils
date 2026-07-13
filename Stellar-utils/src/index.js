const StellarSdk = require('stellar-sdk');

function createValidationError(message, field) {
  const error = new TypeError(`ValidationError: ${message}`);
  error.code = 'VALIDATION_ERROR';
  error.field = field;
  return error;
}

function createNetworkError(message, cause) {
  const error = new Error(`NetworkError: ${message}`);
  error.code = 'NETWORK_ERROR';
  error.cause = cause;
  return error;
}

function wrapHorizonError(action, error) {
  const detail = error && error.message ? error.message : 'Unknown Horizon error';
  return createNetworkError(`Failed to ${action}. ${detail}`, error);
}

/**
 * Validate a Stellar address
 * @param {string} address - The Stellar address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateAddress(address) {
  try {
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  } catch (e) {
    return false;
  }
}

/**
 * Validate a Stellar secret key
 * @param {string} secretKey - The Stellar secret key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateSecretKey(secretKey) {
  try {
    return StellarSdk.StrKey.isValidEd25519SecretSeed(secretKey);
  } catch (e) {
    return false;
  }
}

/**
 * Generate a new Stellar keypair
 * @returns {Object} Keypair object with publicKey and secretKey
 */
function generateKeypair() {
  const pair = StellarSdk.Keypair.random();
  return {
    publicKey: pair.publicKey(),
    secretKey: pair.secret()
  };
}

/**
 * Get the balance of a Stellar address
 * @param {string} address - The Stellar address
 * @param {string} [network='testnet'] - The network to use ('testnet' or 'public')
 * @returns {Promise<Array>} Array of balances
 */
async function getBalance(address, network = 'testnet') {
  const server = network === 'public' 
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');

  try {
    const account = await server.loadAccount(address);
    return account.balances;
  } catch (error) {
    throw wrapHorizonError('load account balances', error);
  }
}

/**
 * Create and sign a payment transaction
 * @param {string} sourceSecret - Source account secret key
 * @param {string} destinationAddress - Destination address
 * @param {string} amount - Amount to send
 * @param {string} [assetCode='XLM'] - Asset code (default XLM)
 * @param {string} [assetIssuer=null] - Asset issuer (required for non-XLM assets
 * @param {string} [network='testnet'] - Network to use
 * @returns {Promise<string>} Signed transaction XDR
 */
async function createPaymentTransaction(sourceSecret, destinationAddress, amount, assetCode = 'XLM', assetIssuer = null, network = 'testnet') {
  const server = network === 'public' 
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');
  
  let sourceKeypair;
  try {
    sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  } catch (error) {
    throw createValidationError('Invalid source secret key.', 'sourceSecret');
  }

  if (!validateAddress(destinationAddress)) {
    throw createValidationError('Invalid destination address.', 'destinationAddress');
  }

  if (assetCode !== 'XLM' && !validateAddress(assetIssuer)) {
    throw createValidationError('Asset issuer must be a valid Stellar address for non-XLM assets.', 'assetIssuer');
  }

  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  } catch (error) {
    throw wrapHorizonError('load source account', error);
  }
  
  let asset;
  if (assetCode === 'XLM') {
    asset = StellarSdk.Asset.native();
  } else {
    asset = new StellarSdk.Asset(assetCode, assetIssuer);
  }
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: destinationAddress,
      asset: asset,
      amount: amount
    }))
    .setTimeout(30)
    .build();
  
  transaction.sign(sourceKeypair);
  return transaction.toXDR();
}

/**
 * Submit a transaction to the network
 * @param {string} transactionXDR - Signed transaction XDR
 * @param {string} [network='testnet'] - Network to use
 * @returns {Promise<Object>} Transaction result
 */
async function submitTransaction(transactionXDR, network = 'testnet') {
  const server = network === 'public' 
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');
  
  let transaction;
  try {
    transaction = new StellarSdk.Transaction(transactionXDR, network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET);
  } catch (error) {
    throw createValidationError('Invalid transaction XDR.', 'transactionXDR');
  }

  try {
    return await server.submitTransaction(transaction);
  } catch (error) {
    throw wrapHorizonError('submit transaction', error);
  }
}

module.exports = {
  createValidationError,
  createNetworkError,
  validateAddress,
  validateSecretKey,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
};

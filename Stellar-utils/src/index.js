const StellarSdk = require('stellar-sdk');

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

function getServer(network = 'testnet') {
  if (!['testnet', 'public'].includes(network)) {
    throw new Error("network must be 'testnet' or 'public'");
  }

  return network === 'public'
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');
}

function getNetworkPassphrase(network = 'testnet') {
  if (!['testnet', 'public'].includes(network)) {
    throw new Error("network must be 'testnet' or 'public'");
  }

  return network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
}

function validateSignerWeight(weight) {
  return Number.isInteger(weight) && weight >= 0 && weight <= 255;
}

function validateThreshold(threshold) {
  return Number.isInteger(threshold) && threshold >= 0 && threshold <= 255;
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

  const account = await server.loadAccount(address);
  return account.balances;
}

/**
 * Create a signed transaction that adds, updates, or removes an account signer.
 * Set weight to 0 to remove the signer.
 * @param {string} sourceSecret - Source account secret key
 * @param {string} signerPublicKey - Signer public key to add/update/remove
 * @param {number} weight - Signer weight from 0 to 255
 * @param {string} [network='testnet'] - Network to use
 * @returns {Promise<string>} Signed transaction XDR
 */
async function addSignerTransaction(sourceSecret, signerPublicKey, weight, network = 'testnet') {
  if (!validateSecretKey(sourceSecret)) {
    throw new Error('sourceSecret must be a valid Stellar secret key');
  }

  if (!validateAddress(signerPublicKey)) {
    throw new Error('signerPublicKey must be a valid Stellar public key');
  }

  if (!validateSignerWeight(weight)) {
    throw new Error('weight must be an integer from 0 to 255');
  }

  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const server = getServer(network);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network)
  })
    .addOperation(StellarSdk.Operation.setOptions({
      signer: {
        ed25519PublicKey: signerPublicKey,
        weight
      }
    }))
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  return transaction.toXDR();
}

/**
 * Create a signed transaction that updates account thresholds.
 * @param {string} sourceSecret - Source account secret key
 * @param {Object} thresholds - Threshold values to set
 * @param {number} [thresholds.low] - Low threshold
 * @param {number} [thresholds.medium] - Medium threshold
 * @param {number} [thresholds.high] - High threshold
 * @param {string} [network='testnet'] - Network to use
 * @returns {Promise<string>} Signed transaction XDR
 */
async function setAccountThresholdsTransaction(sourceSecret, thresholds, network = 'testnet') {
  if (!validateSecretKey(sourceSecret)) {
    throw new Error('sourceSecret must be a valid Stellar secret key');
  }

  if (!thresholds || typeof thresholds !== 'object') {
    throw new Error('thresholds must be an object');
  }

  const operation = {};
  if (thresholds.low !== undefined) {
    if (!validateThreshold(thresholds.low)) {
      throw new Error('low threshold must be an integer from 0 to 255');
    }
    operation.lowThreshold = thresholds.low;
  }
  if (thresholds.medium !== undefined) {
    if (!validateThreshold(thresholds.medium)) {
      throw new Error('medium threshold must be an integer from 0 to 255');
    }
    operation.medThreshold = thresholds.medium;
  }
  if (thresholds.high !== undefined) {
    if (!validateThreshold(thresholds.high)) {
      throw new Error('high threshold must be an integer from 0 to 255');
    }
    operation.highThreshold = thresholds.high;
  }

  if (Object.keys(operation).length === 0) {
    throw new Error('at least one threshold must be provided');
  }

  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const server = getServer(network);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network)
  })
    .addOperation(StellarSdk.Operation.setOptions(operation))
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  return transaction.toXDR();
}

/**
 * Add multiple signatures to an existing transaction XDR.
 * @param {string} transactionXDR - Transaction XDR to sign
 * @param {string[]} secretKeys - Secret keys that should sign the transaction
 * @param {string} [network='testnet'] - Network to use
 * @returns {string} Signed transaction XDR
 */
function signTransactionWithKeys(transactionXDR, secretKeys, network = 'testnet') {
  if (typeof transactionXDR !== 'string' || transactionXDR.trim() === '') {
    throw new Error('transactionXDR must be a non-empty string');
  }

  if (!Array.isArray(secretKeys) || secretKeys.length === 0) {
    throw new Error('secretKeys must be a non-empty array');
  }

  const keypairs = secretKeys.map((secretKey) => {
    if (!validateSecretKey(secretKey)) {
      throw new Error('secretKeys must contain only valid Stellar secret keys');
    }
    return StellarSdk.Keypair.fromSecret(secretKey);
  });

  const transaction = new StellarSdk.Transaction(transactionXDR, getNetworkPassphrase(network));
  keypairs.forEach((keypair) => transaction.sign(keypair));
  return transaction.toXDR();
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
  
  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  
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
  
  const transaction = new StellarSdk.Transaction(transactionXDR, network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET);
  return await server.submitTransaction(transaction);
}

module.exports = {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  getBalance,
  addSignerTransaction,
  setAccountThresholdsTransaction,
  signTransactionWithKeys,
  createPaymentTransaction,
  submitTransaction
};

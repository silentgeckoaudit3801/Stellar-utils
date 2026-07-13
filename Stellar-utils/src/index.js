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

/**
 * Validate an issued Stellar asset code.
 * @param {string} assetCode - Asset code to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateAssetCode(assetCode) {
  return typeof assetCode === 'string' && /^[A-Z0-9]{1,12}$/.test(assetCode);
}

/**
 * Return a Horizon server for the requested network.
 * @param {string} network - Network name ('testnet' or 'public')
 * @returns {Object} Horizon server
 */
function getServer(network = 'testnet') {
  if (!['testnet', 'public'].includes(network)) {
    throw new Error("network must be 'testnet' or 'public'");
  }

  return network === 'public'
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');
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
 * Verify an issued asset and its issuer account.
 * @param {string} assetCode - Issued asset code
 * @param {string} assetIssuer - Issuer public key
 * @param {Object} [options] - Verification options
 * @param {string} [options.network='testnet'] - Network to use ('testnet' or 'public')
 * @param {string} [options.trustlineAddress] - Optional account to check for an asset trustline
 * @returns {Promise<Object>} Asset, issuer, and optional trustline verification result
 */
async function verifyAssetIssuer(assetCode, assetIssuer, options = {}) {
  const network = options.network || 'testnet';

  if (!validateAssetCode(assetCode)) {
    throw new Error('assetCode must be 1-12 uppercase letters or numbers');
  }

  if (!validateAddress(assetIssuer)) {
    throw new Error('assetIssuer must be a valid Stellar public key');
  }

  if (options.trustlineAddress && !validateAddress(options.trustlineAddress)) {
    throw new Error('trustlineAddress must be a valid Stellar public key');
  }

  const server = getServer(network);
  const assetPage = await server.assets()
    .forCode(assetCode)
    .forIssuer(assetIssuer)
    .limit(1)
    .call();
  const assetRecord = assetPage.records[0] || null;

  let issuerAccount = null;
  try {
    issuerAccount = await server.loadAccount(assetIssuer);
  } catch (error) {
    if (error && error.response && error.response.status === 404) {
      issuerAccount = null;
    } else {
      throw error;
    }
  }

  let trustline = {
    checked: false,
    exists: null,
    account: options.trustlineAddress || null
  };

  if (options.trustlineAddress) {
    const holder = await server.loadAccount(options.trustlineAddress);
    const balance = holder.balances.find((entry) => (
      entry.asset_type !== 'native' &&
      entry.asset_code === assetCode &&
      entry.asset_issuer === assetIssuer
    ));

    trustline = {
      checked: true,
      exists: Boolean(balance),
      account: options.trustlineAddress,
      balance: balance ? balance.balance : null,
      limit: balance ? balance.limit : null
    };
  }

  return {
    asset: {
      code: assetCode,
      issuer: assetIssuer,
      exists: Boolean(assetRecord),
      accounts: assetRecord ? assetRecord.num_accounts : '0',
      balances: assetRecord ? assetRecord.amount : '0',
      record: assetRecord
    },
    issuer: {
      address: assetIssuer,
      exists: Boolean(issuerAccount),
      balances: issuerAccount ? issuerAccount.balances : [],
      signers: issuerAccount ? issuerAccount.signers : [],
      flags: issuerAccount ? issuerAccount.flags : null
    },
    trustline,
    network
  };
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
  validateAssetCode,
  generateKeypair,
  getBalance,
  verifyAssetIssuer,
  createPaymentTransaction,
  submitTransaction
};

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

function formatTransactionRecord(record) {
  const asset = record.asset_type === 'native'
    ? 'XLM'
    : [record.asset_code, record.asset_issuer].filter(Boolean).join(':');

  return {
    id: record.id,
    transactionHash: record.transaction_hash,
    type: record.type,
    from: record.from || null,
    to: record.to || record.account || null,
    amount: record.amount || record.starting_balance || null,
    asset,
    createdAt: record.created_at,
    pagingToken: record.paging_token
  };
}

/**
 * Get formatted transaction history for a Stellar address
 * @param {string} address - The Stellar address
 * @param {Object} [options] - Query options
 * @param {number} [options.limit=20] - Number of records to fetch
 * @param {string} [options.cursor] - Optional Horizon paging cursor
 * @param {string} [options.network='testnet'] - Network to use
 * @returns {Promise<Object>} Formatted transaction records and next cursor
 */
async function getTransactionHistory(address, options = {}) {
  if (!validateAddress(address)) {
    throw new TypeError('Invalid Stellar address.');
  }

  const {
    limit = 20,
    cursor = null,
    network = 'testnet'
  } = options;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
  const server = network === 'public'
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');

  let request = server
    .payments()
    .forAccount(address)
    .order('desc')
    .limit(safeLimit);

  if (cursor) {
    request = request.cursor(cursor);
  }

  const page = await request.call();
  const records = page.records.map(formatTransactionRecord);

  return {
    records,
    nextCursor: records.length ? records[records.length - 1].pagingToken : null,
    hasMore: page.records.length === safeLimit,
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
  generateKeypair,
  getBalance,
  getTransactionHistory,
  createPaymentTransaction,
  submitTransaction
};

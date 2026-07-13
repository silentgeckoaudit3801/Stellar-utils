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

/**
 * Build a Stellar memo from a normalized memo option.
 * @param {Object|null|string} memo - Memo option or text memo string
 * @param {string} memo.type - Memo type: none, text, id, hash, or return
 * @param {string} memo.value - Memo value
 * @returns {Object|null} StellarSdk.Memo instance or null for no memo
 */
function buildMemo(memo = null) {
  if (memo === null || memo === undefined || memo === '') {
    return null;
  }

  if (typeof memo === 'string') {
    memo = { type: 'text', value: memo };
  }

  if (typeof memo !== 'object') {
    throw new TypeError('Memo must be a string or an object with type and value.');
  }

  const type = String(memo.type || 'none').toLowerCase();
  const value = memo.value;

  if (type === 'none') {
    return null;
  }

  if (type === 'text') {
    if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 28) {
      throw new RangeError('Text memo must be a UTF-8 string up to 28 bytes.');
    }
    return StellarSdk.Memo.text(value);
  }

  if (type === 'id') {
    const normalized = String(value);
    if (!/^\d+$/.test(normalized) || BigInt(normalized) > BigInt('18446744073709551615')) {
      throw new RangeError('ID memo must be an unsigned 64-bit integer string.');
    }
    return StellarSdk.Memo.id(normalized);
  }

  if (type === 'hash' || type === 'return') {
    if (typeof value !== 'string' || !/^[0-9a-fA-F]{64}$/.test(value)) {
      throw new RangeError(`${type} memo must be a 32-byte hex string.`);
    }

    const bytes = Buffer.from(value, 'hex');
    return type === 'hash'
      ? StellarSdk.Memo.hash(bytes)
      : StellarSdk.Memo.returnHash(bytes);
  }

  throw new TypeError('Memo type must be one of: none, text, id, hash, return.');
}

/**
 * Create and sign a payment transaction
 * @param {string} sourceSecret - Source account secret key
 * @param {string} destinationAddress - Destination address
 * @param {string} amount - Amount to send
 * @param {string} [assetCode='XLM'] - Asset code (default XLM)
 * @param {string} [assetIssuer=null] - Asset issuer (required for non-XLM assets
 * @param {string} [network='testnet'] - Network to use
 * @param {Object|null|string} [memo=null] - Optional memo string or { type, value }
 * @returns {Promise<string>} Signed transaction XDR
 */
async function createPaymentTransaction(sourceSecret, destinationAddress, amount, assetCode = 'XLM', assetIssuer = null, network = 'testnet', memo = null) {
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
  
  const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: network === 'public' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: destinationAddress,
      asset: asset,
      amount: amount
    }));

  const stellarMemo = buildMemo(memo);
  if (stellarMemo) {
    builder.addMemo(stellarMemo);
  }

  const transaction = builder.setTimeout(30).build();
  
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
  buildMemo,
  createPaymentTransaction,
  submitTransaction
};

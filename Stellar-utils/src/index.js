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
 * Validate a Stellar memo value against protocol size/type limits.
 * @param {string} type - Memo type: none, text, id, hash, or return.
 * @param {string|number|bigint|Buffer|Uint8Array|null} value - Memo value
 * @returns {{valid: boolean, type: string, error: string|null}} Validation result
 */
function validateMemo(type, value = null) {
  const memoType = String(type || '').toLowerCase();
  const ok = () => ({ valid: true, type: memoType, error: null });
  const fail = (error) => ({ valid: false, type: memoType, error });

  if (memoType === 'none') {
    return value === null || value === undefined || value === ''
      ? ok()
      : fail('memo_none must not include a value');
  }

  if (memoType === 'text') {
    if (typeof value !== 'string') return fail('memo_text must be a string');
    return Buffer.byteLength(value, 'utf8') <= 28
      ? ok()
      : fail('memo_text must be 28 bytes or fewer');
  }

  if (memoType === 'id') {
    if (value === null || value === undefined || value === '') {
      return fail('memo_id is required');
    }

    const normalized = String(value);
    if (!/^\d+$/.test(normalized)) {
      return fail('memo_id must be an unsigned integer');
    }

    const id = BigInt(normalized);
    return id <= 18446744073709551615n
      ? ok()
      : fail('memo_id must fit in uint64');
  }

  if (memoType === 'hash' || memoType === 'return') {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return value.length === 32
        ? ok()
        : fail(`memo_${memoType} must be exactly 32 bytes`);
    }

    if (typeof value !== 'string') {
      return fail(`memo_${memoType} must be a 32-byte buffer, hex, or base64 string`);
    }

    const trimmed = value.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return ok();

    try {
      return Buffer.from(trimmed, 'base64').length === 32
        ? ok()
        : fail(`memo_${memoType} must decode to exactly 32 bytes`);
    } catch (e) {
      return fail(`memo_${memoType} must be valid hex or base64`);
    }
  }

  return fail('unsupported memo type');
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
  validateMemo,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
};

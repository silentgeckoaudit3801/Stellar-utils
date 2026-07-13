const StellarSdk = require('stellar-sdk');

/**
 * Validate a Stellar public account address.
 *
 * @example
 * const isValid = validateAddress("GABC...");
 *
 * @param {string} address - Stellar Ed25519 public key beginning with `G`.
 * @returns {boolean} True when the address is a valid Stellar public key.
 */
function validateAddress(address) {
  try {
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  } catch (e) {
    return false;
  }
}

/**
 * Validate a Stellar secret seed.
 *
 * @example
 * const isValid = validateSecretKey("SABC...");
 *
 * @param {string} secretKey - Stellar Ed25519 secret seed beginning with `S`.
 * @returns {boolean} True when the secret key is a valid Stellar secret seed.
 */
function validateSecretKey(secretKey) {
  try {
    return StellarSdk.StrKey.isValidEd25519SecretSeed(secretKey);
  } catch (e) {
    return false;
  }
}

/**
 * Generate a new random Stellar keypair.
 *
 * @example
 * const { publicKey, secretKey } = generateKeypair();
 *
 * @returns {{publicKey: string, secretKey: string}} Public account id and secret seed.
 */
function generateKeypair() {
  const pair = StellarSdk.Keypair.random();
  return {
    publicKey: pair.publicKey(),
    secretKey: pair.secret()
  };
}

/**
 * Load balances for a Stellar account from Horizon.
 *
 * @example
 * const balances = await getBalance("GABC...", "testnet");
 *
 * @param {string} address - Stellar account public key to load from Horizon.
 * @param {'testnet'|'public'} [network='testnet'] - Horizon network selector.
 * @returns {Promise<Array<Object>>} Horizon balance rows for the account.
 */
async function getBalance(address, network = 'testnet') {
  const server = network === 'public' 
    ? new StellarSdk.Server('https://horizon.stellar.org')
    : new StellarSdk.Server('https://horizon-testnet.stellar.org');

  const account = await server.loadAccount(address);
  return account.balances;
}

/**
 * Create, sign, and serialize a Stellar payment transaction.
 *
 * @example
 * const xdr = await createPaymentTransaction(
 *   sourceSecret,
 *   destinationAddress,
 *   "10",
 *   "XLM",
 *   null,
 *   "testnet"
 * );
 *
 * @param {string} sourceSecret - Secret seed for the source account.
 * @param {string} destinationAddress - Stellar public key receiving the payment.
 * @param {string} amount - Decimal amount string accepted by Horizon, e.g. `"10.5"`.
 * @param {string} [assetCode='XLM'] - Asset code to send; use `XLM` for native lumens.
 * @param {?string} [assetIssuer=null] - Issuer public key for non-native assets.
 * @param {'testnet'|'public'} [network='testnet'] - Horizon and passphrase network selector.
 * @returns {Promise<string>} Signed transaction encoded as base64 XDR.
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
 * Submit a signed transaction XDR to Horizon.
 *
 * @example
 * const result = await submitTransaction(transactionXDR, "testnet");
 *
 * @param {string} transactionXDR - Signed transaction encoded as base64 XDR.
 * @param {'testnet'|'public'} [network='testnet'] - Horizon and passphrase network selector.
 * @returns {Promise<Object>} Horizon transaction submission result.
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
  createPaymentTransaction,
  submitTransaction
};

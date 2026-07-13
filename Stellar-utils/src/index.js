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

function readAssetCode(asset) {
  if (!asset) return null;
  if (asset === 'native' || asset.asset_type === 'native') return 'XLM';
  if (typeof asset.getCode === 'function') return asset.getCode();
  return asset.asset_code || asset.code || asset.assetCode || null;
}

function readAssetIssuer(asset) {
  if (!asset) return null;
  if (asset === 'native' || asset.asset_type === 'native') return null;
  if (typeof asset.getIssuer === 'function') return asset.getIssuer();
  return asset.asset_issuer || asset.issuer || asset.assetIssuer || null;
}

/**
 * Format a Stellar asset for display.
 * @param {Object|string} asset - Horizon balance, SDK Asset, or asset-like object
 * @param {Object} [options]
 * @param {boolean} [options.includeIssuer=true] - Include issuer for issued assets
 * @param {number} [options.issuerChars=4] - Characters to keep at each issuer edge
 * @returns {string} Formatted asset label
 */
function formatAsset(asset, options = {}) {
  const { includeIssuer = true, issuerChars = 4 } = options;
  const code = readAssetCode(asset);
  const issuer = readAssetIssuer(asset);

  if (!code) return 'Unknown asset';
  if (code === 'XLM' || !issuer || !includeIssuer) return code;

  const edge = Math.max(1, Number(issuerChars) || 4);
  const shortIssuer = issuer.length > edge * 2
    ? `${issuer.slice(0, edge)}...${issuer.slice(-edge)}`
    : issuer;

  return `${code}:${shortIssuer}`;
}

/**
 * Format a Stellar balance amount for display.
 * @param {string|number} amount - Amount to format
 * @param {Object} [options]
 * @param {string} [options.locale='en-US'] - Intl locale
 * @param {number} [options.minimumFractionDigits=0] - Minimum decimals
 * @param {number} [options.maximumFractionDigits=7] - Maximum decimals
 * @returns {string} Formatted amount
 */
function formatBalanceAmount(amount, options = {}) {
  const {
    locale = 'en-US',
    minimumFractionDigits = 0,
    maximumFractionDigits = 7
  } = options;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return '0';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numericAmount);
}

/**
 * Format a Horizon balance line or asset + amount pair for display.
 * @param {Object|string|number} balance - Horizon balance object or raw amount
 * @param {Object} [options] - Asset and amount formatting options
 * @returns {string} Formatted balance, for example "1,234.5 XLM"
 */
function formatBalance(balance, options = {}) {
  const amount = typeof balance === 'object' && balance !== null
    ? balance.balance
    : balance;

  const asset = options.asset || balance;
  const formattedAmount = formatBalanceAmount(amount, options);
  return `${formattedAmount} ${formatAsset(asset, options)}`;
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
  formatAsset,
  formatBalanceAmount,
  formatBalance,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
};

const {
  createPaymentTransaction,
  validateAddress,
  validateSecretKey
} = require('../src');

async function main() {
  const sourceSecret = process.env.SOURCE_SECRET;
  const destinationAddress = process.env.DESTINATION_ADDRESS;
  const amount = process.env.AMOUNT || '10';
  const assetCode = process.env.ASSET_CODE || 'XLM';
  const assetIssuer = process.env.ASSET_ISSUER || null;
  const network = process.env.STELLAR_NETWORK || 'testnet';

  if (!validateSecretKey(sourceSecret)) {
    throw new Error('Set SOURCE_SECRET to a valid Stellar secret seed.');
  }

  if (!validateAddress(destinationAddress)) {
    throw new Error('Set DESTINATION_ADDRESS to a valid Stellar public key.');
  }

  const transactionXDR = await createPaymentTransaction(
    sourceSecret,
    destinationAddress,
    amount,
    assetCode,
    assetIssuer,
    network
  );

  console.log(transactionXDR);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

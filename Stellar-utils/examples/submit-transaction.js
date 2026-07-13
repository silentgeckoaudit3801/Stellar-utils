const { submitTransaction } = require('../src');

async function main() {
  const transactionXDR = process.env.TRANSACTION_XDR;
  const network = process.env.STELLAR_NETWORK || 'testnet';

  if (!transactionXDR) {
    throw new Error('Set TRANSACTION_XDR to a signed transaction XDR.');
  }

  const result = await submitTransaction(transactionXDR, network);
  console.log('Submitted transaction:', result.hash);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

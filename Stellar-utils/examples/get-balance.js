const { getBalance, validateAddress } = require('../src');

async function main() {
  const address = process.env.STELLAR_ADDRESS;
  const network = process.env.STELLAR_NETWORK || 'testnet';

  if (!validateAddress(address)) {
    throw new Error('Set STELLAR_ADDRESS to a valid Stellar public key.');
  }

  const balances = await getBalance(address, network);

  for (const balance of balances) {
    const asset = balance.asset_type === 'native' ? 'XLM' : balance.asset_code;
    console.log(`${balance.balance} ${asset}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

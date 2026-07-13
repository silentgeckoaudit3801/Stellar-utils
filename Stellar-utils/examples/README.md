# Examples

These examples demonstrate the public helpers exported by `../src`.

Run them from the `Stellar-utils` directory after installing dependencies:

```bash
npm install
node examples/generate-keypair.js
node examples/validate-keys.js
```

Network-backed examples need real testnet accounts or a signed transaction XDR:

```bash
STELLAR_ADDRESS=G... node examples/get-balance.js
SOURCE_SECRET=S... DESTINATION_ADDRESS=G... node examples/create-payment-xdr.js
TRANSACTION_XDR=AAAA... node examples/submit-transaction.js
```

Use `testnet` by default. Set `STELLAR_NETWORK=public` only when you intend to
use mainnet.

## Included examples

- `generate-keypair.js` - creates a new public/secret keypair.
- `validate-keys.js` - validates public and secret keys.
- `get-balance.js` - loads account balances from Horizon.
- `create-payment-xdr.js` - creates a signed XLM or issued-asset payment XDR.
- `submit-transaction.js` - submits a signed transaction XDR.

The examples intentionally read sensitive values from environment variables and
never hard-code secret keys in source files.

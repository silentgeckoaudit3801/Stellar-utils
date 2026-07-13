# Stellar Utils

Useful utilities and developer helpers for Stellar blockchain development.

Contents in this folder:

- `src/` - library source (exports used utilities)
- `tests/` - unit tests
- `frontend/` - example static demo for the utilities
- `backend/` - example Express API wrapping the utilities
- `contract/` - Soroban contract scaffold (Rust)

Quick start

1. Install dependencies and run the library tests:

```bash
npm install
npm test
```

2. Import the shared helpers:

```javascript
const {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
} = require("./src");
```

3. Generate and validate a Stellar keypair:

```javascript
const pair = generateKeypair();

console.log(pair.publicKey);
console.log(validateAddress(pair.publicKey)); // true
console.log(validateSecretKey(pair.secretKey)); // true
```

4. Check balances on testnet or public network:

```javascript
async function printBalances(address) {
  const balances = await getBalance(address, "testnet");

  for (const balance of balances) {
    const asset = balance.asset_type === "native" ? "XLM" : balance.asset_code;
    console.log(`${balance.balance} ${asset}`);
  }
}
```

5. Create and sign an XLM payment transaction:

```javascript
async function buildPayment(sourceSecret, destinationAddress) {
  return createPaymentTransaction(
    sourceSecret,
    destinationAddress,
    "10",
    "XLM",
    null,
    "testnet"
  );
}
```

6. Create and sign a payment for an issued asset:

```javascript
async function buildIssuedAssetPayment(sourceSecret, destinationAddress) {
  return createPaymentTransaction(
    sourceSecret,
    destinationAddress,
    "25.5",
    "USDC",
    "GA5ZSEJYB37X4GL4Q65P5BKZTDGU6GR4OY4OTUYRFTUEXAMPLEISSUER",
    "testnet"
  );
}
```

7. Submit a signed transaction XDR:

```javascript
async function submitSignedXdr(transactionXDR) {
  const result = await submitTransaction(transactionXDR, "testnet");
  console.log(result.hash);
  return result;
}
```

8. Run the example frontend: open `frontend/index.html` in a browser.

Project layout and purpose

- `frontend/` - Minimal demo UI that uses the backend API or directly imports
  utilities for quick manual testing.
- `backend/` - Small Express server exposing endpoints like `/health` and
  `/generate-keypair` that call into `src/`.
- `contract/` - Starter Soroban contract demonstrating a simple escrow-like
  function; intended as a minimal template to extend.

Continuous Integration

This repository includes GitHub Actions workflows that run on every push and
pull request:

- `ci.yml` - root CI job that installs dependencies, executes unit tests,
  checks backend and frontend script syntax, validates frontend HTML, and
  builds both Soroban contracts.
- `build-contracts.yml` - isolated contract build workflow for `contract/`
  and `Stellar-Wallet-Dashboard/contract/`.

To run the CI checks locally, use:

```bash
npm test
node --check backend/index.js
node --check frontend/app.js
```

For contract verification, install the Rust toolchain and Soroban CLI locally:

```bash
rustup install stable
cargo install --locked soroban-cli
cd contract && soroban build
```

Dashboard examples

- `Stellar-Wallet-Dashboard/examples/generate-keypair.js`
- `Stellar-Wallet-Dashboard/examples/check-balance.js`

These scripts demonstrate how to use the shared Stellar utility library and
how to call the dashboard backend.

Contributing

Please follow the repository workflow and see `CONTRIBUTING.md` for issue
triage, branch naming, and pull request expectations.

License: GPL-3.0

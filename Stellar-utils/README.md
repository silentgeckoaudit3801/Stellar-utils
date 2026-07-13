# Stellar Utils

Useful utilities and developer helpers for Stellar blockchain development.

Contents in this folder:

- `src/` â€” library source (exports used utilities)
- `tests/` â€” unit tests
- `frontend/` â€” example static demo for the utilities
- `backend/` â€” example Express API wrapping the utilities
- `contract/` â€” Soroban contract scaffold (Rust)

Quick start

1. Install dependencies for backend (Node.js >= 18) and run tests:

```bash
cd backend
npm install
npm test
```

2. Run the example frontend (static page): open `frontend/index.html` in a browser.

Project layout and purpose

- `frontend/` â€” Minimal demo UI that uses the backend API or directly imports
  utilities for quick manual testing.
- `backend/` â€” Small Express server exposing endpoints like `/health` and
  `/generate-keypair` that call into `src/`.
- `contract/` â€” Starter Soroban contract demonstrating a simple escrow-like
  function; intended as a minimal template to extend.

Continuous Integration

This repository includes GitHub Actions workflows that run on every push and
pull request:

- `ci.yml` â€” root CI job that installs dependencies, executes unit tests,
  checks backend and frontend script syntax, validates frontend HTML, and
  builds both Soroban contracts.
- `build-contracts.yml` â€” isolated contract build workflow for `contract/`
  and `Stellar-Wallet-Dashboard/contract/`.

To run the CI checks locally, use:

```bash
npm test
node --check backend/index.js
node --check frontend/app.js
```

Balance formatting

The shared library exports three display helpers for Stellar balances:

```javascript
const { formatAsset, formatBalanceAmount, formatBalance } = require("./src");

formatAsset({ asset_type: "native" }); // "XLM"
formatAsset({ asset_code: "USDC", asset_issuer: "G..." }); // "USDC:GABC...WXYZ"
formatBalanceAmount("1234.5000000"); // "1,234.5"
formatBalance({ balance: "25.0000000", asset_type: "native" }); // "25 XLM"
```

`formatAsset(asset, options)` accepts Horizon balance objects, asset-like
objects with `code` / `issuer`, and Stellar SDK `Asset` instances. Issued asset
labels include a shortened issuer by default; pass `{ includeIssuer: false }`
to show only the asset code or `{ issuerChars: 6 }` to keep more issuer
characters at each edge.

`formatBalanceAmount(amount, options)` uses `Intl.NumberFormat`, defaults to
the `en-US` locale, trims insignificant decimals, and supports
`locale`, `minimumFractionDigits`, and `maximumFractionDigits` options.

`formatBalance(balance, options)` combines both helpers for complete display
strings such as `1,234.5 XLM` or `98,765.4321 USDC:GABC...WXYZ`.

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

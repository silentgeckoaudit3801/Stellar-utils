# Stellar Utils

Useful utilities and developer helpers for Stellar blockchain development.

Contents in this folder:

- `src/` — library source (exports used utilities)
- `tests/` — unit tests
- `frontend/` — example static demo for the utilities
- `backend/` — example Express API wrapping the utilities
- `contract/` — Soroban contract scaffold (Rust)

Quick start

1. Install dependencies for backend (Node.js >= 18) and run tests:

```bash
cd backend
npm install
npm test
```

2. Run the example frontend (static page): open `frontend/index.html` in a browser.

Project layout and purpose

- `frontend/` — Minimal demo UI that uses the backend API or directly imports
  utilities for quick manual testing.
- `backend/` — Small Express server exposing endpoints like `/health` and
  `/generate-keypair` that call into `src/`.
- `contract/` — Starter Soroban contract demonstrating a simple escrow-like
  function; intended as a minimal template to extend.

Continuous Integration

This repository includes GitHub Actions workflows that run on every push and
pull request:

- `ci.yml` — root CI job that installs dependencies, executes unit tests,
  checks backend and frontend script syntax, validates frontend HTML, and
  builds both Soroban contracts.
- `build-contracts.yml` — isolated contract build workflow for `contract/`
  and `Stellar-Wallet-Dashboard/contract/`.

To run the CI checks locally, use:

```bash
npm test
node --check backend/index.js
node --check frontend/app.js
```

Memo validation

The shared library exports `validateMemo(type, value)` for Stellar memo
validation:

```javascript
const { validateMemo } = require("./src");

validateMemo("text", "invoice-123");
validateMemo("id", "18446744073709551615");
validateMemo("hash", "a".repeat(64));
```

Supported memo types are `none`, `text`, `id`, `hash`, and `return`.
`memo_text` is limited to 28 UTF-8 bytes, `memo_id` must fit in uint64, and
`memo_hash` / `memo_return` must be exactly 32 bytes as a buffer, hex string,
or base64 string. The function returns `{ valid, type, error }` so callers can
show clear validation errors.

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

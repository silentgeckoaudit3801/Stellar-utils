# API Reference

This guide documents the public helpers exported from `src/index.js`.

```javascript
const {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
} = require("../src");
```

## `validateAddress(address)`

Validates a Stellar public account address.

Parameters:

- `address` (`string`): Stellar Ed25519 public key, usually beginning with `G`.

Returns:

- `boolean`: `true` when the address is valid, otherwise `false`.

Example:

```javascript
const isValid = validateAddress("GABC...");

if (!isValid) {
  throw new Error("Invalid destination address");
}
```

Best practices:

- Validate user-provided destination addresses before building a transaction.
- Treat leading or trailing whitespace as invalid unless your UI explicitly
  trims it before calling this helper.

## `validateSecretKey(secretKey)`

Validates a Stellar secret seed.

Parameters:

- `secretKey` (`string`): Stellar Ed25519 secret seed, usually beginning with
  `S`.

Returns:

- `boolean`: `true` when the secret key is valid, otherwise `false`.

Example:

```javascript
const canSign = validateSecretKey(process.env.STELLAR_SECRET_KEY);

if (!canSign) {
  throw new Error("Missing or invalid signer secret");
}
```

Best practices:

- Never commit secret keys to source control.
- Prefer environment variables or a dedicated secret manager for signer keys.
- Do not log secret keys while debugging validation failures.

## `generateKeypair()`

Generates a random Stellar keypair.

Parameters:

- None.

Returns:

- `Object`: `{ publicKey, secretKey }`.
- `publicKey` (`string`): Account id that can be shared publicly.
- `secretKey` (`string`): Secret seed that can sign transactions.

Example:

```javascript
const { publicKey, secretKey } = generateKeypair();

console.log("Fund this account:", publicKey);
```

Best practices:

- Store generated secret keys immediately and securely.
- Use testnet for development accounts.
- Do not use randomly generated keys for production funds until your key
  storage and backup process is in place.

## `getBalance(address, network)`

Loads account balances from Horizon.

Parameters:

- `address` (`string`): Stellar public account address.
- `network` (`"testnet" | "public"`): Optional network selector. Defaults to
  `"testnet"`.

Returns:

- `Promise<Array>`: Horizon balance rows for the account.

Example:

```javascript
async function printBalances(address) {
  const balances = await getBalance(address, "testnet");

  for (const balance of balances) {
    const asset = balance.asset_type === "native" ? "XLM" : balance.asset_code;
    console.log(`${balance.balance} ${asset}`);
  }
}
```

Best practices:

- Catch Horizon errors so your application can show a useful message for
  unfunded accounts or network outages.
- Use `"public"` only when you intend to query mainnet.

## `createPaymentTransaction(...)`

Builds, signs, and serializes a payment transaction.

Signature:

```javascript
createPaymentTransaction(
  sourceSecret,
  destinationAddress,
  amount,
  assetCode = "XLM",
  assetIssuer = null,
  network = "testnet"
)
```

Parameters:

- `sourceSecret` (`string`): Secret seed for the source account.
- `destinationAddress` (`string`): Stellar public key receiving the payment.
- `amount` (`string`): Decimal amount string, for example `"10"` or
  `"25.5"`.
- `assetCode` (`string`): Asset code to send. Defaults to native `XLM`.
- `assetIssuer` (`string | null`): Issuer address for non-native assets.
- `network` (`"testnet" | "public"`): Optional network selector. Defaults to
  `"testnet"`.

Returns:

- `Promise<string>`: Signed transaction encoded as base64 XDR.

Native XLM example:

```javascript
const transactionXDR = await createPaymentTransaction(
  sourceSecret,
  destinationAddress,
  "10",
  "XLM",
  null,
  "testnet"
);
```

Issued asset example:

```javascript
const transactionXDR = await createPaymentTransaction(
  sourceSecret,
  destinationAddress,
  "25.5",
  "USDC",
  "GA5ZSEJYB37X4GL4Q65P5BKZTDGU6GR4OY4OTUYRFTUEXAMPLEISSUER",
  "testnet"
);
```

Best practices:

- Validate source and destination keys before creating a transaction.
- Pass `assetIssuer` for every non-XLM asset.
- Keep `amount` as a string to avoid floating-point rounding surprises.
- Confirm the selected network before signing, especially for production code.

## `submitTransaction(transactionXDR, network)`

Submits a signed transaction XDR to Horizon.

Parameters:

- `transactionXDR` (`string`): Signed transaction encoded as base64 XDR.
- `network` (`"testnet" | "public"`): Optional network selector. Defaults to
  `"testnet"`.

Returns:

- `Promise<Object>`: Horizon transaction submission result.

Example:

```javascript
const result = await submitTransaction(transactionXDR, "testnet");
console.log("Submitted transaction:", result.hash);
```

Best practices:

- Submit to the same network used to build and sign the transaction.
- Catch and inspect Horizon errors for sequence, fee, trustline, and balance
  failures.
- Store the returned transaction hash for later reconciliation.

## Error handling pattern

Network-backed helpers can throw when Horizon is unavailable, the account is
unfunded, the transaction sequence is stale, or the submitted transaction is
invalid. Wrap those calls in `try` / `catch` blocks:

```javascript
try {
  const transactionXDR = await createPaymentTransaction(
    sourceSecret,
    destinationAddress,
    "10"
  );
  const result = await submitTransaction(transactionXDR);
  console.log(result.hash);
} catch (error) {
  console.error("Stellar operation failed:", error.message);
}
```

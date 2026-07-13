const {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  createTrustlineTransaction
} = require('../src/index');

describe('Stellar Utils', () => {
  describe('validateAddress', () => {
    test('should return true for valid address', () => {
      // Use a generated keypair here because some static example keys
      // may not be valid according to `stellar-sdk`'s validators.
      // Generating at runtime guarantees a valid public key for the test.
      const { publicKey } = generateKeypair();
      expect(validateAddress(publicKey)).toBe(true);
    });

    test('should return false for invalid address', () => {
      expect(validateAddress('invalid')).toBe(false);
      expect(validateAddress('')).toBe(false);
      expect(validateAddress(null)).toBe(false);
    });
  });

  describe('validateSecretKey', () => {
    test('should return true for valid secret key', () => {
      // Use a generated keypair for the same reason as above — ensures
      // the secret seed is a valid Ed25519 secret according to the SDK.
      const { secretKey } = generateKeypair();
      expect(validateSecretKey(secretKey)).toBe(true);
    });

    test('should return false for invalid secret key', () => {
      expect(validateSecretKey('invalid')).toBe(false);
      expect(validateSecretKey('')).toBe(false);
      expect(validateSecretKey(null)).toBe(false);
    });
  });

  describe('generateKeypair', () => {
    test('should generate a valid keypair', () => {
      const pair = generateKeypair();
      expect(pair.publicKey).toBeDefined();
      expect(pair.secretKey).toBeDefined();
      expect(validateAddress(pair.publicKey)).toBe(true);
      expect(validateSecretKey(pair.secretKey)).toBe(true);
    });
  });

  describe('createTrustlineTransaction', () => {
    test('should be exported as a function', () => {
      expect(typeof createTrustlineTransaction).toBe('function');
    });

    test('should reject invalid source secret keys before loading account', async () => {
      await expect(
        createTrustlineTransaction('invalid', 'USDC', generateKeypair().publicKey)
      ).rejects.toThrow(TypeError);
    });

    test('should reject invalid asset codes before loading account', async () => {
      const { secretKey, publicKey } = generateKeypair();
      await expect(
        createTrustlineTransaction(secretKey, 'too-long-asset-code', publicKey)
      ).rejects.toThrow(TypeError);
    });

    test('should reject invalid issuer public keys before loading account', async () => {
      const { secretKey } = generateKeypair();
      await expect(
        createTrustlineTransaction(secretKey, 'USDC', 'invalid')
      ).rejects.toThrow(TypeError);
    });
  });
});

const { validateAddress, validateSecretKey, generateKeypair } = require('../src/index');

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

    test('should reject malformed public-key inputs', () => {
      const { publicKey, secretKey } = generateKeypair();

      expect(validateAddress(secretKey)).toBe(false);
      expect(validateAddress(` ${publicKey}`)).toBe(false);
      expect(validateAddress(`${publicKey} `)).toBe(false);
      expect(validateAddress(publicKey.slice(0, -1))).toBe(false);
      expect(validateAddress(undefined)).toBe(false);
      expect(validateAddress({ publicKey })).toBe(false);
    });
  });

  describe('validateSecretKey', () => {
    test('should return true for valid secret key', () => {
      // Use a generated keypair for the same reason as above -- ensures
      // the secret seed is a valid Ed25519 secret according to the SDK.
      const { secretKey } = generateKeypair();
      expect(validateSecretKey(secretKey)).toBe(true);
    });

    test('should return false for invalid secret key', () => {
      expect(validateSecretKey('invalid')).toBe(false);
      expect(validateSecretKey('')).toBe(false);
      expect(validateSecretKey(null)).toBe(false);
    });

    test('should reject malformed secret-key inputs', () => {
      const { publicKey, secretKey } = generateKeypair();

      expect(validateSecretKey(publicKey)).toBe(false);
      expect(validateSecretKey(` ${secretKey}`)).toBe(false);
      expect(validateSecretKey(`${secretKey} `)).toBe(false);
      expect(validateSecretKey(secretKey.slice(0, -1))).toBe(false);
      expect(validateSecretKey(undefined)).toBe(false);
      expect(validateSecretKey({ secretKey })).toBe(false);
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
});

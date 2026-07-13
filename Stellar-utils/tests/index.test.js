const {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  getBalance,
  createPaymentTransaction,
  submitTransaction
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

  describe('public method validation', () => {
    test('getBalance should reject invalid addresses before loading Horizon account', async () => {
      await expect(getBalance('invalid')).rejects.toThrow(TypeError);
    });

    test('getBalance should reject invalid networks', async () => {
      const { publicKey } = generateKeypair();
      await expect(getBalance(publicKey, 'badnet')).rejects.toThrow(TypeError);
    });

    test('createPaymentTransaction should reject invalid source secrets', async () => {
      const { publicKey } = generateKeypair();
      await expect(
        createPaymentTransaction('invalid', publicKey, '1')
      ).rejects.toThrow(TypeError);
    });

    test('createPaymentTransaction should reject invalid destinations and amounts', async () => {
      const { secretKey } = generateKeypair();
      await expect(
        createPaymentTransaction(secretKey, 'invalid', '1')
      ).rejects.toThrow(TypeError);
      await expect(
        createPaymentTransaction(secretKey, generateKeypair().publicKey, '0')
      ).rejects.toThrow(TypeError);
    });

    test('createPaymentTransaction should reject invalid issued asset inputs', async () => {
      const { secretKey, publicKey } = generateKeypair();
      await expect(
        createPaymentTransaction(secretKey, publicKey, '1', 'lower')
      ).rejects.toThrow(TypeError);
      await expect(
        createPaymentTransaction(secretKey, publicKey, '1', 'USDC', 'invalid')
      ).rejects.toThrow(TypeError);
    });

    test('submitTransaction should reject empty XDR and invalid networks', async () => {
      await expect(submitTransaction('')).rejects.toThrow(TypeError);
      await expect(submitTransaction('AAAA', 'badnet')).rejects.toThrow(TypeError);
    });
  });
});

const {
  validateAddress,
  validateSecretKey,
  generateKeypair,
  addSignerTransaction,
  setAccountThresholdsTransaction,
  signTransactionWithKeys
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

  describe('multi-signature helpers', () => {
    test('should export multisig helper functions', () => {
      expect(typeof addSignerTransaction).toBe('function');
      expect(typeof setAccountThresholdsTransaction).toBe('function');
      expect(typeof signTransactionWithKeys).toBe('function');
    });

    test('should reject invalid signer inputs before network calls', async () => {
      const { secretKey } = generateKeypair();

      await expect(
        addSignerTransaction('bad-secret', generateKeypair().publicKey, 1)
      ).rejects.toThrow('sourceSecret must be a valid Stellar secret key');

      await expect(
        addSignerTransaction(secretKey, 'bad-signer', 1)
      ).rejects.toThrow('signerPublicKey must be a valid Stellar public key');

      await expect(
        addSignerTransaction(secretKey, generateKeypair().publicKey, 300)
      ).rejects.toThrow('weight must be an integer from 0 to 255');
    });

    test('should reject invalid threshold inputs before network calls', async () => {
      const { secretKey } = generateKeypair();

      await expect(
        setAccountThresholdsTransaction('bad-secret', { low: 1 })
      ).rejects.toThrow('sourceSecret must be a valid Stellar secret key');

      await expect(
        setAccountThresholdsTransaction(secretKey, {})
      ).rejects.toThrow('at least one threshold must be provided');

      await expect(
        setAccountThresholdsTransaction(secretKey, { medium: 256 })
      ).rejects.toThrow('medium threshold must be an integer from 0 to 255');
    });

    test('should reject invalid signing inputs before parsing XDR', () => {
      expect(() => signTransactionWithKeys('', [generateKeypair().secretKey])).toThrow(
        'transactionXDR must be a non-empty string'
      );

      expect(() => signTransactionWithKeys('AAAA', [])).toThrow(
        'secretKeys must be a non-empty array'
      );

      expect(() => signTransactionWithKeys('AAAA', ['bad-secret'])).toThrow(
        'secretKeys must contain only valid Stellar secret keys'
      );
    });
  });
});

const {
  validateAddress,
  validateSecretKey,
  validateAssetCode,
  generateKeypair,
  verifyAssetIssuer
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

  describe('validateAssetCode', () => {
    test('should accept uppercase alphanumeric issued asset codes', () => {
      expect(validateAssetCode('USDC')).toBe(true);
      expect(validateAssetCode('A1')).toBe(true);
      expect(validateAssetCode('ABCDEFGHIJKL')).toBe(true);
    });

    test('should reject invalid issued asset codes', () => {
      expect(validateAssetCode('')).toBe(false);
      expect(validateAssetCode('lower')).toBe(false);
      expect(validateAssetCode('TOO-LONG-CODE')).toBe(false);
      expect(validateAssetCode('ABCDEFGHIJKLM')).toBe(false);
      expect(validateAssetCode(null)).toBe(false);
    });
  });

  describe('verifyAssetIssuer', () => {
    test('should be exported as a function', () => {
      expect(typeof verifyAssetIssuer).toBe('function');
    });

    test('should reject invalid asset codes before network calls', async () => {
      const { publicKey } = generateKeypair();
      await expect(verifyAssetIssuer('bad-code', publicKey)).rejects.toThrow(
        'assetCode must be 1-12 uppercase letters or numbers'
      );
    });

    test('should reject invalid issuer accounts before network calls', async () => {
      await expect(verifyAssetIssuer('USDC', 'not-an-issuer')).rejects.toThrow(
        'assetIssuer must be a valid Stellar public key'
      );
    });

    test('should reject invalid optional trustline accounts before network calls', async () => {
      const { publicKey } = generateKeypair();
      await expect(
        verifyAssetIssuer('USDC', publicKey, { trustlineAddress: 'bad-holder' })
      ).rejects.toThrow('trustlineAddress must be a valid Stellar public key');
    });
  });
});

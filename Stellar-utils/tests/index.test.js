const {
  createValidationError,
  createNetworkError,
  validateAddress,
  validateSecretKey,
  generateKeypair,
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

  describe('standard errors', () => {
    test('createValidationError should use TypeError with standard code and field', () => {
      const error = createValidationError('Invalid input.', 'address');
      expect(error).toBeInstanceOf(TypeError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('address');
      expect(error.message).toBe('ValidationError: Invalid input.');
    });

    test('createNetworkError should use Error with standard code and cause', () => {
      const cause = new Error('timeout');
      const error = createNetworkError('Failed request.', cause);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.cause).toBe(cause);
      expect(error.message).toBe('NetworkError: Failed request.');
    });

    test('createPaymentTransaction should reject invalid inputs with validation errors', async () => {
      await expect(
        createPaymentTransaction('invalid', generateKeypair().publicKey, '1')
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'sourceSecret' });

      await expect(
        createPaymentTransaction(generateKeypair().secretKey, 'invalid', '1')
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'destinationAddress' });
    });

    test('submitTransaction should reject invalid XDR with validation error', async () => {
      await expect(submitTransaction('bad-xdr')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        field: 'transactionXDR'
      });
    });
  });
});

const {
  withRetry,
  isTransientHorizonError,
  validateAddress,
  validateSecretKey,
  generateKeypair
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

  describe('network retry handling', () => {
    test('should identify transient Horizon errors', () => {
      expect(isTransientHorizonError(new Error('network down'))).toBe(true);
      expect(isTransientHorizonError({ status: 429 })).toBe(true);
      expect(isTransientHorizonError({ status: 503 })).toBe(true);
      expect(isTransientHorizonError({ status: 400 })).toBe(false);
    });

    test('should retry transient errors and return success', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error('temporary');
          error.status = 503;
          throw error;
        }
        return 'ok';
      }, { retries: 2, delayMs: 0 });

      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });

    test('should not retry non-transient errors', async () => {
      let attempts = 0;
      await expect(withRetry(async () => {
        attempts += 1;
        const error = new Error('bad request');
        error.status = 400;
        throw error;
      }, { retries: 3, delayMs: 0 })).rejects.toThrow('Horizon request failed after 1 attempt(s): bad request');

      expect(attempts).toBe(1);
    });

    test('should report a clear message after retries are exhausted', async () => {
      await expect(withRetry(async () => {
        const error = new Error('still unavailable');
        error.status = 503;
        throw error;
      }, { retries: 1, delayMs: 0 })).rejects.toThrow('Horizon request failed after 2 attempt(s): still unavailable');
    });
  });
});

const { validateAddress, validateSecretKey, generateKeypair, createAccount } = require('../src/index');

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
  describe('createAccount', () => {
    test('should create and fund a testnet account through friendbot', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ successful: true, hash: 'abc123' })
      });

      const account = await createAccount('testnet', { fetchFn });

      expect(validateAddress(account.publicKey)).toBe(true);
      expect(validateSecretKey(account.secretKey)).toBe(true);
      expect(account.network).toBe('testnet');
      expect(account.funded).toBe(true);
      expect(account.friendbotResponse).toEqual({ successful: true, hash: 'abc123' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(fetchFn.mock.calls[0][0]).toMatch(/^https://friendbot.stellar.org?addr=G/);
    });

    test('should reject public network account creation without a funded source account', async () => {
      await expect(createAccount('public')).rejects.toThrow('only supports testnet');
    });

    test('should surface clear friendbot errors', async () => {
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ detail: 'rate limit exceeded' })
      });

      await expect(createAccount('testnet', { fetchFn })).rejects.toThrow('rate limit exceeded');
    });
  });
});

const StellarSdk = require('stellar-sdk');
const { validateAddress, validateSecretKey, generateKeypair, getBalance } = require('../src/index');

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
  describe('getBalance integration', () => {
    const testnetBalances = [
      { asset_type: 'native', balance: '1000.0000000' },
      { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GDUKMGUGDZQK6YHXS25T2JXU5WP4EJUBUYMYF6OWIA5VYEOL763QLS2V', balance: '42.5000000' }
    ];

    let originalServer;
    let loadAccount;
    let createdServers;

    beforeEach(() => {
      originalServer = StellarSdk.Server;
      loadAccount = jest.fn().mockResolvedValue({ balances: testnetBalances });
      createdServers = [];
      StellarSdk.Server = jest.fn().mockImplementation((url) => {
        createdServers.push(url);
        return { loadAccount };
      });
    });

    afterEach(() => {
      StellarSdk.Server = originalServer;
    });

    test('loads balances from Horizon testnet by default', async () => {
      const balances = await getBalance('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');

      expect(createdServers).toEqual(['https://horizon-testnet.stellar.org']);
      expect(loadAccount).toHaveBeenCalledWith('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');
      expect(balances).toEqual(testnetBalances);
    });

    test('loads balances from public Horizon when requested', async () => {
      await getBalance('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H', 'public');

      expect(createdServers).toEqual(['https://horizon.stellar.org']);
    });

    test('propagates Horizon loadAccount errors', async () => {
      loadAccount.mockRejectedValueOnce(new Error('account not found'));

      await expect(getBalance('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF')).rejects.toThrow('account not found');
    });
  });
});

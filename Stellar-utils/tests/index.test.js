const {
  validateAddress,
  validateSecretKey,
  formatAsset,
  formatBalanceAmount,
  formatBalance,
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

  describe('balance formatters', () => {
    const issuer = 'G'.repeat(56);

    test('should format native and issued assets', () => {
      expect(formatAsset({ asset_type: 'native' })).toBe('XLM');
      expect(formatAsset({ asset_code: 'USDC', asset_issuer: issuer })).toBe('USDC:GGGG...GGGG');
      expect(formatAsset({ code: 'EURC', issuer }, { includeIssuer: false })).toBe('EURC');
    });

    test('should format balance amounts with locale support', () => {
      expect(formatBalanceAmount('1234.5000000')).toBe('1,234.5');
      expect(formatBalanceAmount('1234.5678912', { maximumFractionDigits: 2 })).toBe('1,234.57');
      expect(formatBalanceAmount('1234.5', { locale: 'de-DE', minimumFractionDigits: 2 })).toBe('1.234,50');
      expect(formatBalanceAmount('not-a-number')).toBe('0');
    });

    test('should format complete Horizon balance lines', () => {
      expect(formatBalance({ balance: '25.0000000', asset_type: 'native' })).toBe('25 XLM');
      expect(formatBalance({
        balance: '98765.4321000',
        asset_code: 'USDC',
        asset_issuer: issuer
      })).toBe('98,765.4321 USDC:GGGG...GGGG');
    });
  });
});

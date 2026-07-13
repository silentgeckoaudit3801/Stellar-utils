const { validateAddress, validateSecretKey, validateMemo, generateKeypair } = require('../src/index');

describe('Stellar Utils', () => {
  describe('validateAddress', () => {
    test('should return true for valid address', () => {
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

  describe('validateMemo', () => {
    test('should validate memo_none with no value', () => {
      expect(validateMemo('none')).toEqual({
        valid: true,
        type: 'none',
        error: null
      });
      expect(validateMemo('none', 'unexpected').valid).toBe(false);
    });

    test('should enforce memo_text 28 byte limit', () => {
      expect(validateMemo('text', 'hello stellar').valid).toBe(true);
      expect(validateMemo('text', '1234567890123456789012345678').valid).toBe(true);
      expect(validateMemo('text', '12345678901234567890123456789').valid).toBe(false);
      expect(validateMemo('text', 'rocket'.repeat(5)).valid).toBe(false);
    });

    test('should validate uint64 memo_id values', () => {
      expect(validateMemo('id', '0').valid).toBe(true);
      expect(validateMemo('id', 123).valid).toBe(true);
      expect(validateMemo('id', '18446744073709551615').valid).toBe(true);
      expect(validateMemo('id', '-1').valid).toBe(false);
      expect(validateMemo('id', '18446744073709551616').valid).toBe(false);
      expect(validateMemo('id', 'not-a-number').valid).toBe(false);
    });

    test('should validate 32-byte hash and return memo values', () => {
      const hex = 'a'.repeat(64);
      const base64 = Buffer.alloc(32, 1).toString('base64');
      const bytes = Buffer.alloc(32, 2);

      expect(validateMemo('hash', hex).valid).toBe(true);
      expect(validateMemo('hash', base64).valid).toBe(true);
      expect(validateMemo('return', bytes).valid).toBe(true);
      expect(validateMemo('hash', 'a'.repeat(62)).valid).toBe(false);
      expect(validateMemo('return', Buffer.alloc(31)).valid).toBe(false);
    });

    test('should reject unsupported memo types', () => {
      expect(validateMemo('future', 'value')).toEqual({
        valid: false,
        type: 'future',
        error: 'unsupported memo type'
      });
    });
  });
});

const { validateAddress, validateSecretKey, generateKeypair, buildMemo } = require('../src/index');

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

  describe('buildMemo', () => {
    test('should return null for empty memo options', () => {
      expect(buildMemo()).toBeNull();
      expect(buildMemo({ type: 'none' })).toBeNull();
    });

    test('should build text memos from strings and objects', () => {
      expect(buildMemo('hello').type).toBe('text');
      expect(buildMemo({ type: 'text', value: 'payment note' }).type).toBe('text');
    });

    test('should reject text memos over 28 bytes', () => {
      expect(() => buildMemo({ type: 'text', value: 'a'.repeat(29) })).toThrow(RangeError);
    });

    test('should build and validate id memos', () => {
      expect(buildMemo({ type: 'id', value: '12345' }).type).toBe('id');
      expect(() => buildMemo({ type: 'id', value: '-1' })).toThrow(RangeError);
      expect(() => buildMemo({ type: 'id', value: '18446744073709551616' })).toThrow(RangeError);
    });

    test('should build hash and return hash memos from 32-byte hex strings', () => {
      const hex = 'a'.repeat(64);
      expect(buildMemo({ type: 'hash', value: hex }).type).toBe('hash');
      expect(buildMemo({ type: 'return', value: hex }).type).toBe('return');
    });

    test('should reject invalid hash memo values and memo types', () => {
      expect(() => buildMemo({ type: 'hash', value: 'abc' })).toThrow(RangeError);
      expect(() => buildMemo({ type: 'return', value: 'z'.repeat(64) })).toThrow(RangeError);
      expect(() => buildMemo({ type: 'bad', value: 'x' })).toThrow(TypeError);
    });
  });
});

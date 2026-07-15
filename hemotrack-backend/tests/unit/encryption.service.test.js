import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/services/encryption.service.js';

describe('encryption.service', () => {
  describe('encrypt', () => {
    it('should encrypt a string and return iv:encrypted format', () => {
      const result = encrypt('my-api-key-123');
      expect(result).toBeDefined();
      expect(result).toContain(':');
      const parts = result.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(encrypt(undefined)).toBeNull();
    });

    it('should produce different output for same input (random IV)', () => {
      const enc1 = encrypt('same-key');
      const enc2 = encrypt('same-key');
      expect(enc1).not.toBe(enc2);
    });

    it('should not contain the original text in output', () => {
      const apiKey = 'my-secret-gemini-key';
      const encrypted = encrypt(apiKey);
      expect(encrypted).not.toContain(apiKey);
    });
  });

  describe('decrypt', () => {
    it('should decrypt back to original value', () => {
      const original = 'AIzaSyTest123456';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should return null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('should handle long API keys', () => {
      const longKey = 'sk-proj-' + 'a'.repeat(80);
      const encrypted = encrypt(longKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longKey);
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key-with-special_chars.and/symbols==';
      const encrypted = encrypt(specialKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(specialKey);
    });
  });
});

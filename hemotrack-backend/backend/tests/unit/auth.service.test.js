import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, generateToken } from '../../src/services/auth.service.js';
import jwt from 'jsonwebtoken';

describe('auth.service', () => {
  describe('hashPassword', () => {
    it('should hash a password and return a bcrypt string', async () => {
      const hash = await hashPassword('mypassword123');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[ab]\$/);
      expect(hash).not.toBe('mypassword123');
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hashPassword('samepassword');
      const hash2 = await hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('correctpassword');
      const result = await comparePassword('correctpassword', hash);
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hash = await hashPassword('correctpassword');
      const result = await comparePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty string', async () => {
      const hash = await hashPassword('password');
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(42);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should contain the correct userId in payload', () => {
      const token = generateToken(99);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(99);
    });

    it('should expire according to JWT_EXPIRES_IN', () => {
      const token = generateToken(1);
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});

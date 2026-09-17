import { describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HasherService } from './hasher.service';

describe('HasherService', () => {
  let service: HasherService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HasherService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: number): number => {
              if (key === 'BCRYPT_COST') return 4; // low cost for fast tests
              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(HasherService);
  });

  describe('hash', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await service.hash('correct horse battery staple');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('produces a different hash for the same input (salt)', async () => {
      const hash1 = await service.hash('same-password');
      const hash2 = await service.hash('same-password');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('returns true for the correct password', async () => {
      const hash = await service.hash('correct horse battery staple');
      const result = await service.compare(
        'correct horse battery staple',
        hash,
      );
      expect(result).toBe(true);
    });

    it('returns false for the wrong password', async () => {
      const hash = await service.hash('correct horse battery staple');
      const result = await service.compare('wrong password', hash);
      expect(result).toBe(false);
    });

    it('returns false for a malformed hash (does not throw)', async () => {
      const result = await service.compare(
        'anything',
        'not-a-valid-bcrypt-hash',
      );
      expect(result).toBe(false);
    });

    it('returns false for an empty hash (does not throw)', async () => {
      const result = await service.compare('anything', '');
      expect(result).toBe(false);
    });
  });
});

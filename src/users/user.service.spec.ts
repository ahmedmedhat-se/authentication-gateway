import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
      update: ReturnType<typeof jest.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UserService);
  });

  describe('findByEmail', () => {
    it('normalizes the email before lookup', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await service.findByEmail('  USER@Example.COM  ');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('returns null when the user does not exist', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('queries by id', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await service.findById('some-uuid');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'some-uuid' },
      });
    });
  });

  describe('create', () => {
    it('normalizes the email before insert', async () => {
      const created = {
        id: 'uuid',
        email: 'user@example.com',
        passwordHash: 'hash',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.mocked(prisma.user.create).mockResolvedValue(created);

      await service.create('  USER@Example.COM  ', 'hash');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash',
        },
      });
    });
  });

  describe('updatePassword', () => {
    it('updates the passwordHash for the given user', async () => {
      jest.mocked(prisma.user.update).mockResolvedValue({});

      await service.updatePassword('user-id', 'new-hash');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { passwordHash: 'new-hash' },
      });
    });
  });

  describe('markVerified', () => {
    it('sets emailVerified to true', async () => {
      jest.mocked(prisma.user.update).mockResolvedValue({});

      await service.markVerified('user-id');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { emailVerified: true },
      });
    });
  });
});

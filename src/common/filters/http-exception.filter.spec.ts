import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function buildHost(req: unknown, res: MockResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let res: MockResponse;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('wraps HttpException with its explicit code', () => {
    const exception = new ConflictException('EMAIL_ALREADY_REGISTERED');
    const host = buildHost({ requestId: 'req-1' }, res);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'EMAIL_ALREADY_REGISTERED',
        details: [],
        requestId: 'req-1',
      },
    });
  });

  it('maps validation arrays to a generic message with details', () => {
    const exception = new BadRequestException([
      'email must be a valid email',
      'password must be at least 12 characters',
    ]);
    const host = buildHost({ requestId: 'req-2' }, res);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = res.json.mock.calls[0][0] as {
      error: { code: string; message: string; details: unknown[] };
    };
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.message).toBe('Request validation failed');
    expect(body.error.details).toHaveLength(2);
  });

  it('returns INTERNAL_ERROR for unexpected exceptions', () => {
    const host = buildHost(
      { requestId: 'req-3', method: 'GET', url: '/x' },
      res,
    );

    filter.catch(new Error('boom'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = res.json.mock.calls[0][0] as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });
});

import { Client } from 'whatsapp-web.js';
import { DeleteResult } from 'mongoose';
import { IWhatsAppSession } from '../interfaces/whatsapp.interface';
import { SessionResponseDto } from '../dto/session-response.dto';

export interface MockExec<T> {
  exec: jest.Mock<Promise<T>, []>;
}

export interface MockClient {
  destroy: jest.Mock<Promise<void>, []>;
}

export const createMockExec = <T>(value: T): MockExec<T> => ({
  exec: jest.fn<Promise<T>, []>().mockResolvedValue(value),
});

export const mockSessionModel = {
  findOne: jest.fn<MockExec<IWhatsAppSession | null>, [object]>(),
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  }),
  create: jest.fn<Promise<IWhatsAppSession>, [Partial<IWhatsAppSession>]>(),
  findOneAndUpdate: jest.fn<
    MockExec<IWhatsAppSession | null>,
    [object, object, object?]
  >(),
  deleteOne: jest.fn<Promise<DeleteResult>, [object]>(),
};

export const mockRedisService = {
  deleteSession: jest.fn<Promise<boolean>, [string]>(),
  getSession: jest.fn<Promise<{ status: string } | null>, [string]>(),
  getSessionTTL: jest.fn<Promise<number>, [string]>(),
  isSessionActive: jest.fn<Promise<boolean>, [string]>(),
};

export const mockEventsService = {
  registerAllEvents: jest.fn<Promise<void>, [Client, string]>(),
  registerClientEvents: jest.fn<Promise<void>, [Client, string]>(),
};

export const mockSocketGateway = {};

export const mockClient: Partial<Client> = {
  destroy: jest.fn().mockResolvedValue(undefined),
};

export const mockWhatsAppWebJs = {
  Client: jest.fn().mockImplementation(() => mockClient),
  LocalAuth: jest.fn(),
};

export const createMockSession = (
  overrides: Partial<IWhatsAppSession> = {},
): IWhatsAppSession => ({
  clientName: 'test-client',
  status: 'pending',
  sessionId: 'as51da98sd4a98s4a',
  qrAttempts: 1,
  ...overrides,
});

export const createMockDeleteResult = (
  deletedCount: number = 1,
): DeleteResult => ({
  acknowledged: true,
  deletedCount,
});

export const createMockSessionResponse = (
  overrides: Partial<SessionResponseDto> = {},
): SessionResponseDto => ({
  sessionId: 'session-123',
  status: 'pending',
  clientName: 'test-client',
  ...overrides,
});

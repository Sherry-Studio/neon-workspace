import type { Role } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        username: string;
        email?: string;
        tokenVersion: number;
      };
      id?: string;
    }
  }
}

export {};

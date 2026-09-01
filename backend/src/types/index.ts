import type { Request } from 'express';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum GameCategory {
  ARCADE = 'ARCADE',
  RACING = 'RACING',
  SHOOTER = 'SHOOTER',
  ACTION = 'ACTION',
  CASUAL = 'CASUAL',
}

export enum GameStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum BlogCategory {
  GAME_HISTORY = 'GAME HISTORY',
  GAMING_NEWS = 'GAMING NEWS',
  GAME_DEVELOPMENT = 'GAME DEVELOPMENT',
  GAMING_CULTURE = 'GAMING CULTURE',
  TIPS_AND_TRICKS = 'TIPS & TRICKS',
}

export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  GAME_UPDATE = 'GAME_UPDATE',
  NEW_GAME = 'NEW_GAME',
  NEW_POST = 'NEW_POST',
  LEADERBOARD = 'LEADERBOARD',
  ACHIEVEMENT = 'ACHIEVEMENT',
  ADMIN = 'ADMIN',
}

export interface AuthTokenPayload {
  sub: string; // user id
  role: Role;
  tokenVersion: number;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    username: string;
    email?: string;
    tokenVersion: number;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  status?: string;
  category?: string;
}

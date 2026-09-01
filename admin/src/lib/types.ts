/**
 * Domain types for the NEON ARCADE platform.
 *
 * These mirror the intended `Neon-Arcade-Backend` data models (see that repo's
 * `.env.example` / design). The admin panel talks to the API purely through
 * `src/lib/api/*`; when the real backend lands, only the client base URL and,
 * if needed, small response adapters change — not the UI.
 */

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING";
export type GameStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type NotificationType =
  | "SYSTEM"
  | "GAME"
  | "BLOG"
  | "ACHIEVEMENT"
  | "LEADERBOARD";
export type NotificationAudience = "ONE_USER" | "MULTIPLE_USERS" | "ALL_USERS";

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatar?: string | null;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  /** Present when talking to the real backend. Mock auth uses an httpOnly cookie. */
  accessToken?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string | null;
  gamesPlayed: number;
  totalScore: number;
  highestScore: number;
  achievements: string[];
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  thumbnail?: string | null;
  banner?: string | null;
  gameUrl: string;
  version: string;
  instructions: string;
  controls: string;
  featured: boolean;
  status: GameStatus;
  plays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Score {
  id: string;
  userId: string;
  username: string;
  gameId: string;
  gameTitle: string;
  score: number;
  suspicious?: boolean;
  createdAt: string;
}

export interface LeaderboardEntry extends Score {
  rank: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  category: string;
  tags: string[];
  author: string;
  status: BlogStatus;
  views: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  recipientId?: string | null;
  recipientLabel: string;
  link?: string | null;
  gameId?: string | null;
  blogId?: string | null;
  read: boolean;
  pushDelivered: boolean;
  recipientCount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  totalPlays: number;
  totalScores: number;
  mostPlayedGames: Pick<Game, "id" | "title" | "plays" | "category">[];
  recentUsers: User[];
  recentScores: Score[];
  recentBlogPosts: BlogPost[];
  recentNotifications: NotificationRecord[];
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsData {
  range: AnalyticsRange;
  usersOverTime: TimeSeriesPoint[];
  playsOverTime: TimeSeriesPoint[];
  scoresOverTime: TimeSeriesPoint[];
  newRegistrations: TimeSeriesPoint[];
  mostPlayedGames: { label: string; value: number }[];
  topPlayers: { label: string; value: number }[];
}

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface GlobalSearchResults {
  users: User[];
  games: Game[];
  blog: BlogPost[];
  scores: Score[];
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export const GAME_CATEGORIES = [
  "Action",
  "Arcade",
  "Racing",
  "Shooter",
  "Puzzle",
  "Platformer",
  "Strategy",
] as const;

export const BLOG_CATEGORIES = [
  "Game History",
  "Gaming News",
  "Game Development",
  "Gaming Culture",
  "Tips & Tricks",
] as const;

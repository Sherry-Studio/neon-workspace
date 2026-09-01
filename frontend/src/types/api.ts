/** Shapes returned by the NEON ARCADE backend (see backend/src/models/*). */

export interface Game {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  banner: string;
  image: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  gameUrl: string;
  version: string;
  plays: number;
  likes: number;
  featured: boolean;
  instructions: string;
  controls: string[];
  genre: string;
  tagline: string;
  platform: string;
  gradient: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string[] | string;
  coverImage: string;
  heroImage: string;
  heroGradient: string;
  category: string;
  author: string;
  tags: string[];
  readTime: string;
  pullQuote: string | null;
  relatedGames: string[];
  views: number;
  publishDate: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  totalScore?: number;
  plays?: number;
  duration?: number;
  achievedAt?: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProfileStats {
  gamesPlayed: number;
  totalScore: number;
  highestScore: number;
  lastPlayedAt?: string;
}

export interface Profile {
  username: string;
  email: string | null;
  avatar: string;
  bio: string;
  role: string;
  stats: ProfileStats;
  isVerified: boolean;
  createdAt: string;
}

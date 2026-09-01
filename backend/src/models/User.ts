import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { Role } from '../types';

export interface UserStats {
  gamesPlayed: number;
  totalScore: number;
  highestScore: number;
  lastPlayedAt?: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  usernameLower: string;
  email?: string;
  passwordHash: string;
  avatar: string;
  bio: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  tokenVersion: number;
  stats: UserStats;
  achievements: Types.ObjectId[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): Record<string, unknown>;
  toSelfJSON(): Record<string, unknown>;
  toAdminJSON(): Record<string, unknown>;
}

export type UserModel = Model<IUser>;

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 24 },
    usernameLower: { type: String, required: true, unique: true, lowercase: true, index: true },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: 'nebula' },
    bio: { type: String, default: '', maxlength: 280 },
    role: { type: String, enum: Object.values(Role), default: Role.USER, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      lastPlayedAt: { type: Date },
    },
    achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.totalScore': -1 });

userSchema.methods.toPublicJSON = function (this: IUser) {
  return {
    id: this._id.toString(),
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    stats: {
      gamesPlayed: this.stats.gamesPlayed,
      totalScore: this.stats.totalScore,
      highestScore: this.stats.highestScore,
    },
    memberSince: this.createdAt,
  };
};

userSchema.methods.toSelfJSON = function (this: IUser) {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email ?? null,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    isActive: this.isActive,
    isVerified: this.isVerified,
    stats: this.stats,
    achievements: this.achievements,
    lastLoginAt: this.lastLoginAt ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.methods.toAdminJSON = function (this: IUser) {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email ?? null,
    avatar: this.avatar,
    role: this.role,
    isActive: this.isActive,
    isVerified: this.isVerified,
    stats: this.stats,
    lastLoginAt: this.lastLoginAt ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = model<IUser>('User', userSchema);

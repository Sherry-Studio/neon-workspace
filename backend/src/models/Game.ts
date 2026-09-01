import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { GameCategory, GameStatus } from '../types';

export interface IGame extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  banner: string;
  category: GameCategory;
  status: GameStatus;
  gameUrl: string;
  version: string;
  plays: number;
  likes: number;
  featured: boolean;
  instructions: string;
  controls: string[];
  /** Extra display metadata consumed by the existing frontend cards. */
  genre: string;
  tagline: string;
  gradient: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): Record<string, unknown>;
}

export type GameModel = Model<IGame>;

const gameSchema = new Schema<IGame>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '', maxlength: 300 },
    thumbnail: { type: String, default: '' },
    banner: { type: String, default: '' },
    category: {
      type: String,
      enum: Object.values(GameCategory),
      default: GameCategory.ARCADE,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(GameStatus),
      default: GameStatus.DRAFT,
      index: true,
    },
    gameUrl: { type: String, default: '' },
    version: { type: String, default: '1.0.0' },
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    instructions: { type: String, default: '' },
    controls: { type: [String], default: [] },
    genre: { type: String, default: '' },
    tagline: { type: String, default: '' },
    gradient: { type: String, default: 'linear-gradient(135deg,#0f1027,#16213e 55%,#0f3460)' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

gameSchema.index({ status: 1, featured: 1 });
gameSchema.index({ status: 1, category: 1 });
gameSchema.index({ title: 'text', description: 'text', shortDescription: 'text' });

gameSchema.methods.toPublicJSON = function (this: IGame) {
  return {
    id: this._id.toString(),
    title: this.title,
    slug: this.slug,
    description: this.description,
    shortDescription: this.shortDescription,
    thumbnail: this.thumbnail,
    banner: this.banner,
    image: this.thumbnail, // frontend GameCoverCard expects `image`
    category: this.category,
    status: this.status,
    gameUrl: this.gameUrl,
    version: this.version,
    plays: this.plays,
    likes: this.likes,
    featured: this.featured,
    instructions: this.instructions,
    controls: this.controls,
    genre: this.genre || this.category,
    tagline: this.tagline || this.shortDescription,
    platform: 'Browser',
    gradient: this.gradient,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Game = model<IGame>('Game', gameSchema);

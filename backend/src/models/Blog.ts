import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { BlogCategory, BlogStatus } from '../types';

export interface IBlog extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  /** Optional structured paragraphs consumed by the existing Vault article view. */
  contentBlocks: string[];
  coverImage: string;
  heroGradient: string;
  category: BlogCategory;
  author: Types.ObjectId;
  authorName: string;
  tags: string[];
  status: BlogStatus;
  readTime: string;
  pullQuote?: string;
  relatedGames: string[];
  views: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): Record<string, unknown>;
}

export type BlogModel = Model<IBlog>;

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    excerpt: { type: String, default: '', maxlength: 500 },
    content: { type: String, default: '' },
    contentBlocks: { type: [String], default: [] },
    coverImage: { type: String, default: '' },
    heroGradient: {
      type: String,
      default: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    },
    category: {
      type: String,
      enum: Object.values(BlogCategory),
      default: BlogCategory.GAMING_CULTURE,
      index: true,
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: 'NEONARCADE EDITORIAL' },
    tags: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: Object.values(BlogStatus),
      default: BlogStatus.DRAFT,
      index: true,
    },
    readTime: { type: String, default: '5 MIN READ' },
    pullQuote: { type: String },
    relatedGames: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

blogSchema.methods.toPublicJSON = function (this: IBlog) {
  return {
    id: this._id.toString(),
    title: this.title,
    slug: this.slug,
    excerpt: this.excerpt,
    content: this.contentBlocks.length ? this.contentBlocks : this.content,
    coverImage: this.coverImage,
    heroImage: this.coverImage,
    heroGradient: this.heroGradient,
    category: this.category,
    author: this.authorName,
    tags: this.tags,
    readTime: this.readTime,
    pullQuote: this.pullQuote ?? null,
    relatedGames: this.relatedGames,
    views: this.views,
    publishDate: this.publishedAt
      ? this.publishedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : null,
    publishedAt: this.publishedAt ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Blog = model<IBlog>('Blog', blogSchema);

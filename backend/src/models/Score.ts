import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IScore extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gameId: Types.ObjectId;
  score: number;
  duration: number; // seconds
  metadata: Record<string, unknown>;
  playSessionId?: Types.ObjectId;
  flagged: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScoreModel = Model<IScore>;

const scoreSchema = new Schema<IScore>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    score: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    playSessionId: { type: Schema.Types.ObjectId, ref: 'GamePlay' },
    flagged: { type: Boolean, default: false, index: true },
    flagReason: { type: String },
  },
  { timestamps: true },
);

scoreSchema.index({ gameId: 1, score: -1 });
scoreSchema.index({ userId: 1, gameId: 1, score: -1 });
scoreSchema.index({ createdAt: -1 });
scoreSchema.index({ flagged: 1, score: -1 });

export const Score = model<IScore>('Score', scoreSchema);

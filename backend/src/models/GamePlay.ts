import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IGamePlay extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gameId: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  durationSeconds?: number;
  ipHash?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GamePlayModel = Model<IGamePlay>;

const gamePlaySchema = new Schema<IGamePlay>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    score: { type: Number, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    ipHash: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

gamePlaySchema.index({ userId: 1, gameId: 1, startedAt: -1 });
gamePlaySchema.index({ createdAt: -1 });

export const GamePlay = model<IGamePlay>('GamePlay', gamePlaySchema);

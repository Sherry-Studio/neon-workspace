import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/** Rule kinds evaluated by the achievement service after a score/play. */
export type AchievementRuleType =
  | 'FIRST_GAME'
  | 'GAMES_PLAYED'
  | 'HIGH_SCORE'
  | 'TOTAL_SCORE'
  | 'FIRST_WIN'
  | 'MANUAL';

export interface IAchievement extends Document {
  _id: Types.ObjectId;
  key: string;
  title: string;
  description: string;
  icon: string;
  ruleType: AchievementRuleType;
  threshold: number;
  gameId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AchievementModel = Model<IAchievement>;

const achievementSchema = new Schema<IAchievement>(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'trophy' },
    ruleType: {
      type: String,
      enum: ['FIRST_GAME', 'GAMES_PLAYED', 'HIGH_SCORE', 'TOTAL_SCORE', 'FIRST_WIN', 'MANUAL'],
      default: 'MANUAL',
    },
    threshold: { type: Number, default: 0 },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Achievement = model<IAchievement>('Achievement', achievementSchema);

import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  achievementId: Types.ObjectId;
  unlockedAt: Date;
}

export type UserAchievementModel = Model<IUserAchievement>;

const userAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export const UserAchievement = model<IUserAchievement>('UserAchievement', userAchievementSchema);

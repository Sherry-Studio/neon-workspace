import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type TokenPurpose = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

export interface IToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export type TokenModel = Model<IToken>;

const tokenSchema = new Schema<IToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['PASSWORD_RESET', 'EMAIL_VERIFICATION'], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL cleanup once expired.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Token = model<IToken>('Token', tokenSchema);

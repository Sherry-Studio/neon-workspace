import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/** FCM device registration tokens — used by the optional push delivery layer. */
export interface IDeviceToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  platform: 'android' | 'ios' | 'web';
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DeviceTokenModel = Model<IDeviceToken>;

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['android', 'ios', 'web'], default: 'web' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const DeviceToken = model<IDeviceToken>('DeviceToken', deviceTokenSchema);

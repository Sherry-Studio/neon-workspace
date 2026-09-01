import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor: Types.ObjectId;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: Record<string, unknown>;
  ipHash?: string;
  createdAt: Date;
}

export type AuditLogModel = Model<IAuditLog>;

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorUsername: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ipHash: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);

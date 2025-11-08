import mongoose, { Schema, Document } from 'mongoose';

export interface IImportLog extends Document {
  fileName: string;
  sourceUrl: string;
  timestamp: Date;
  total: number;
  new: number;
  updated: number;
  failed: number;
  failedReasons: Array<{
    jobId?: string;
    reason: string;
    error?: string;
  }>;
  status: 'completed' | 'failed' | 'processing';
  processingTime?: number;
  totalBatches?: number;
  completedBatches?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ImportLogSchema: Schema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    sourceUrl: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    new: {
      type: Number,
      required: true,
      default: 0,
    },
    updated: {
      type: Number,
      required: true,
      default: 0,
    },
    failed: {
      type: Number,
      required: true,
      default: 0,
    },
    failedReasons: [
      {
        jobId: String,
        reason: String,
        error: String,
      },
    ],
    status: {
      type: String,
      enum: ['completed', 'failed', 'processing'],
      default: 'processing',
    },
    processingTime: {
      type: Number,
    },
    totalBatches: {
      type: Number,
      default: 0,
    },
    completedBatches: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ImportLogSchema.index({ timestamp: -1 });

export default mongoose.model<IImportLog>('ImportLog', ImportLogSchema);


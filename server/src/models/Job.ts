import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  type?: string;
  region?: string;
  externalId: string;
  sourceUrl: string;
  publishedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    description: {
      type: String,
    },
    url: {
      type: String,
    },
    category: {
      type: String,
    },
    type: {
      type: String,
    },
    region: {
      type: String,
    },
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      required: true,
      index: true,
    },
    publishedDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ externalId: 1, sourceUrl: 1 }, { unique: true });

export default mongoose.model<IJob>('Job', JobSchema);


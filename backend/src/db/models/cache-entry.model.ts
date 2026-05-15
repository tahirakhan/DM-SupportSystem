import { Schema, model } from 'mongoose';

const cacheEntrySchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index: auto-delete when expiresAt is in the past
  },
});

export const CacheEntry = model('CacheEntry', cacheEntrySchema);

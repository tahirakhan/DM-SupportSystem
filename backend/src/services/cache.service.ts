import { CacheEntry } from '../db/models/cache-entry.model';

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const doc = await CacheEntry.findOne({ key });
    if (!doc) return null;
    if (doc.expiresAt.getTime() <= Date.now()) {
      // Best-effort delete stale doc
      await CacheEntry.deleteOne({ _id: doc._id }).catch(() => {});
      return null;
    }
    return doc.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await CacheEntry.findOneAndUpdate(
      { key },
      { value, expiresAt },
      { upsert: true, new: true },
    );
  }

  async invalidate(keyPrefix: string): Promise<number> {
    const escaped = keyPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const res = await CacheEntry.deleteMany({ key: { $regex: '^' + escaped } });
    return res.deletedCount ?? 0;
  }

  async withCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

export const cacheService = new CacheService();

import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  galleries, 
  InsertGallery,
  mediaItems,
  InsertMediaItem,
  categories,
  InsertCategory,
  tags,
  InsertTag,
  mediaCategories,
  InsertMediaCategory,
  mediaTags,
  InsertMediaTag,
  platforms,
  InsertPlatform,
  uploadQueue,
  InsertUploadQueueItem,
  revenue,
  InsertRevenue,
  importJobs,
  InsertImportJob,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= User Management =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= Gallery Management =============

export async function createGallery(gallery: InsertGallery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(galleries).values(gallery);
  return result;
}

export async function getGalleriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(galleries).where(eq(galleries.userId, userId)).orderBy(desc(galleries.createdAt));
}

export async function getGalleryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(galleries).where(eq(galleries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateGalleryStatus(id: number, status: "active" | "error" | "syncing" | "paused") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(galleries).set({ status, updatedAt: new Date() }).where(eq(galleries.id, id));
}

export async function deleteGallery(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(galleries).where(eq(galleries.id, id));
}

// ============= Media Item Management =============

export async function createMediaItem(item: InsertMediaItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(mediaItems).values(item);
  return result;
}

export async function getMediaItemsByUserId(userId: number, filters?: {
  isExplicit?: boolean;
  isApproved?: boolean;
  galleryId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(mediaItems.userId, userId)];
  
  if (filters?.isExplicit !== undefined) {
    conditions.push(eq(mediaItems.isExplicit, filters.isExplicit));
  }
  if (filters?.isApproved !== undefined) {
    conditions.push(eq(mediaItems.isApproved, filters.isApproved));
  }
  if (filters?.galleryId !== undefined) {
    conditions.push(eq(mediaItems.galleryId, filters.galleryId));
  }
  
  let query = db.select().from(mediaItems).where(and(...conditions)).orderBy(desc(mediaItems.createdAt));
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }
  
  return await query;
}

export async function getMediaItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMediaItem(id: number, updates: Partial<InsertMediaItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(mediaItems).set({ ...updates, updatedAt: new Date() }).where(eq(mediaItems.id, id));
}

export async function deleteMediaItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(mediaItems).where(eq(mediaItems.id, id));
}

export async function getMediaItemsByHash(hash: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(mediaItems).where(eq(mediaItems.hash, hash));
}

export async function countMediaItems(userId: number, filters?: { isExplicit?: boolean; isApproved?: boolean }) {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [eq(mediaItems.userId, userId)];
  
  if (filters?.isExplicit !== undefined) {
    conditions.push(eq(mediaItems.isExplicit, filters.isExplicit));
  }
  if (filters?.isApproved !== undefined) {
    conditions.push(eq(mediaItems.isApproved, filters.isApproved));
  }
  
  const result = await db.select({ count: sql<number>`count(*)` }).from(mediaItems).where(and(...conditions));
  return result[0]?.count || 0;
}

// ============= Category Management =============

export async function createCategory(category: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(categories).values(category);
  return result;
}

export async function getCategoriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.sortOrder, desc(categories.createdAt));
}

export async function updateCategory(id: number, updates: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(categories).set({ ...updates, updatedAt: new Date() }).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(categories).where(eq(categories.id, id));
}

// ============= Tag Management =============

export async function createTag(tag: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tags).values(tag);
  return result;
}

export async function getTagsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(desc(tags.usageCount));
}

export async function getOrCreateTag(userId: number, name: string, type: "manual" | "ai_generated" | "platform" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(tags).where(and(eq(tags.userId, userId), eq(tags.name, name))).limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(tags).values({ userId, name, type });
  const newTag = await db.select().from(tags).where(eq(tags.id, Number(result[0].insertId))).limit(1);
  return newTag[0];
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First delete all media-tag relationships
  await db.delete(mediaTags).where(eq(mediaTags.tagId, id));
  // Then delete the tag
  return await db.delete(tags).where(eq(tags.id, id));
}

export async function incrementTagUsage(tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(tags).set({ usageCount: sql`${tags.usageCount} + 1` }).where(eq(tags.id, tagId));
}

// ============= Media-Category Relationships =============

export async function addMediaToCategory(mediaItemId: number, categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(mediaCategories).values({ mediaItemId, categoryId });
}

export async function removeMediaFromCategory(mediaItemId: number, categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(mediaCategories).where(and(eq(mediaCategories.mediaItemId, mediaItemId), eq(mediaCategories.categoryId, categoryId)));
}

export async function getCategoriesForMedia(mediaItemId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({ category: categories }).from(mediaCategories).leftJoin(categories, eq(mediaCategories.categoryId, categories.id)).where(eq(mediaCategories.mediaItemId, mediaItemId));
}

// ============= Media-Tag Relationships =============

export async function addTagToMedia(mediaItemId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(mediaTags).values({ mediaItemId, tagId });
  await incrementTagUsage(tagId);
}

export async function removeTagFromMedia(mediaItemId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(mediaTags).where(and(eq(mediaTags.mediaItemId, mediaItemId), eq(mediaTags.tagId, tagId)));
}

export async function getTagsForMedia(mediaItemId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({ tag: tags }).from(mediaTags).leftJoin(tags, eq(mediaTags.tagId, tags.id)).where(eq(mediaTags.mediaItemId, mediaItemId));
}

// ============= Platform Management =============

export async function createPlatform(platform: InsertPlatform) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(platforms).values(platform);
  return result;
}

export async function getPlatformsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(platforms).where(eq(platforms.userId, userId)).orderBy(desc(platforms.createdAt));
}

export async function getPlatformById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(platforms).where(eq(platforms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePlatform(id: number, updates: Partial<InsertPlatform>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(platforms).set({ ...updates, updatedAt: new Date() }).where(eq(platforms.id, id));
}

export async function deletePlatform(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(platforms).where(eq(platforms.id, id));
}

// ============= Upload Queue Management =============

export async function createUploadQueueItem(item: InsertUploadQueueItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(uploadQueue).values(item);
  return result;
}

export async function getUploadQueueByUserId(userId: number, status?: "pending" | "processing" | "completed" | "failed" | "scheduled") {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(uploadQueue.userId, userId)];
  if (status) {
    conditions.push(eq(uploadQueue.status, status));
  }
  
  return await db.select().from(uploadQueue).where(and(...conditions)).orderBy(desc(uploadQueue.createdAt));
}

export async function getUploadQueueItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(uploadQueue).where(eq(uploadQueue.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUploadQueueItem(id: number, updates: Partial<InsertUploadQueueItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(uploadQueue).set({ ...updates, updatedAt: new Date() }).where(eq(uploadQueue.id, id));
}

export async function deleteUploadQueueItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(uploadQueue).where(eq(uploadQueue.id, id));
}

// ============= Revenue Tracking =============

export async function createRevenue(rev: InsertRevenue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(revenue).values(rev);
  return result;
}

export async function getRevenueByUserId(userId: number, filters?: { platformId?: number; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(revenue.userId, userId)];
  
  if (filters?.platformId) {
    conditions.push(eq(revenue.platformId, filters.platformId));
  }
  if (filters?.startDate) {
    conditions.push(sql`${revenue.transactionDate} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${revenue.transactionDate} <= ${filters.endDate}`);
  }
  
  return await db.select().from(revenue).where(and(...conditions)).orderBy(desc(revenue.transactionDate));
}

export async function getTotalRevenue(userId: number, filters?: { platformId?: number; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [eq(revenue.userId, userId)];
  
  if (filters?.platformId) {
    conditions.push(eq(revenue.platformId, filters.platformId));
  }
  if (filters?.startDate) {
    conditions.push(sql`${revenue.transactionDate} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${revenue.transactionDate} <= ${filters.endDate}`);
  }
  
  const result = await db.select({ total: sql<number>`sum(${revenue.amount})` }).from(revenue).where(and(...conditions));
  return result[0]?.total || 0;
}


// ============= Import Jobs =============

export async function createImportJob(job: InsertImportJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(importJobs).values(job);
  return result;
}

export async function getImportJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(importJobs).where(eq(importJobs.userId, userId)).orderBy(desc(importJobs.createdAt));
}

export async function getImportJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
  return result[0];
}

export async function updateImportJob(id: number, updates: Partial<InsertImportJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(importJobs).set(updates).where(eq(importJobs.id, id));
}

export async function getPendingImportJobs() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(importJobs).where(eq(importJobs.status, "pending")).orderBy(importJobs.createdAt);
}

export async function getScheduledImportJobs() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return await db.select().from(importJobs)
    .where(and(
      eq(importJobs.isRecurring, true),
      sql`${importJobs.nextRunAt} <= ${now}`
    ))
    .orderBy(importJobs.nextRunAt);
}

export async function deleteImportJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(importJobs).where(eq(importJobs.id, id));
}


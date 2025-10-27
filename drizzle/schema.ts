import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Photo gallery connections (Google Photos, local folders, etc.)
 */
export const galleries = mysqlTable("galleries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["google_photos", "local", "dropbox", "onedrive"]).notNull(),
  credentials: text("credentials"), // Encrypted JSON for API credentials
  lastSyncAt: timestamp("lastSyncAt"),
  status: mysqlEnum("status", ["active", "error", "syncing", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Gallery = typeof galleries.$inferSelect;
export type InsertGallery = typeof galleries.$inferInsert;

/**
 * Media items (photos/videos) imported from galleries
 */
export const mediaItems = mysqlTable("media_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  galleryId: int("galleryId"),
  originalUrl: text("originalUrl"), // Original source URL
  storageKey: varchar("storageKey", { length: 512 }).notNull(), // S3 storage key
  storageUrl: text("storageUrl").notNull(), // Public S3 URL
  thumbnailKey: varchar("thumbnailKey", { length: 512 }),
  thumbnailUrl: text("thumbnailUrl"),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize"), // in bytes
  width: int("width"),
  height: int("height"),
  duration: int("duration"), // for videos, in seconds
  hash: varchar("hash", { length: 64 }), // for duplicate detection
  aiAnalysisStatus: mysqlEnum("aiAnalysisStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  aiAnalysisResult: text("aiAnalysisResult"), // JSON with AI analysis data
  nsfwScore: int("nsfwScore"), // 0-100 score
  isExplicit: boolean("isExplicit").default(false).notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  galleryIdIdx: index("galleryId_idx").on(table.galleryId),
  hashIdx: index("hash_idx").on(table.hash),
  explicitIdx: index("isExplicit_idx").on(table.isExplicit),
  approvedIdx: index("isApproved_idx").on(table.isApproved),
}));

export type MediaItem = typeof mediaItems.$inferSelect;
export type InsertMediaItem = typeof mediaItems.$inferInsert;

/**
 * Categories for organizing content
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parentId"), // for hierarchical categories
  color: varchar("color", { length: 7 }), // hex color code
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  parentIdIdx: index("parentId_idx").on(table.parentId),
}));

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Tags for flexible content labeling
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["manual", "ai_generated", "platform"]).default("manual").notNull(),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  nameIdx: index("name_idx").on(table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Many-to-many relationship between media items and categories
 */
export const mediaCategories = mysqlTable("media_categories", {
  id: int("id").autoincrement().primaryKey(),
  mediaItemId: int("mediaItemId").notNull(),
  categoryId: int("categoryId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  mediaItemIdIdx: index("mediaItemId_idx").on(table.mediaItemId),
  categoryIdIdx: index("categoryId_idx").on(table.categoryId),
}));

export type MediaCategory = typeof mediaCategories.$inferSelect;
export type InsertMediaCategory = typeof mediaCategories.$inferInsert;

/**
 * Many-to-many relationship between media items and tags
 */
export const mediaTags = mysqlTable("media_tags", {
  id: int("id").autoincrement().primaryKey(),
  mediaItemId: int("mediaItemId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  mediaItemIdIdx: index("mediaItemId_idx").on(table.mediaItemId),
  tagIdIdx: index("tagId_idx").on(table.tagId),
}));

export type MediaTag = typeof mediaTags.$inferSelect;
export type InsertMediaTag = typeof mediaTags.$inferInsert;

/**
 * Platform configurations for uploading content
 */
export const platforms = mysqlTable("platforms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "OnlyFans", "Fansly", "ManyVids"
  type: varchar("type", { length: 50 }).notNull(),
  credentials: text("credentials"), // Encrypted JSON for API credentials
  profileUrl: varchar("profileUrl", { length: 512 }),
  handle: varchar("handle", { length: 100 }),
  bio: text("bio"),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active").notNull(),
  lastUploadAt: timestamp("lastUploadAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Platform = typeof platforms.$inferSelect;
export type InsertPlatform = typeof platforms.$inferInsert;

/**
 * Upload queue for managing content uploads to platforms
 */
export const uploadQueue = mysqlTable("upload_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mediaItemId: int("mediaItemId").notNull(),
  platformId: int("platformId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "scheduled"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  uploadedAt: timestamp("uploadedAt"),
  platformPostId: varchar("platformPostId", { length: 255 }), // ID from the platform
  platformUrl: text("platformUrl"), // URL to the uploaded content
  title: varchar("title", { length: 255 }),
  description: text("description"),
  price: int("price"), // in cents
  customMetadata: text("customMetadata"), // JSON for platform-specific fields
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  mediaItemIdIdx: index("mediaItemId_idx").on(table.mediaItemId),
  platformIdIdx: index("platformId_idx").on(table.platformId),
  statusIdx: index("status_idx").on(table.status),
}));

export type UploadQueueItem = typeof uploadQueue.$inferSelect;
export type InsertUploadQueueItem = typeof uploadQueue.$inferInsert;

/**
 * Revenue tracking for uploaded content
 */
export const revenue = mysqlTable("revenue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platformId: int("platformId").notNull(),
  uploadQueueId: int("uploadQueueId"),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  transactionType: mysqlEnum("transactionType", ["sale", "subscription", "tip", "other"]).notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  platformTransactionId: varchar("platformTransactionId", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  platformIdIdx: index("platformId_idx").on(table.platformId),
  uploadQueueIdIdx: index("uploadQueueId_idx").on(table.uploadQueueId),
  transactionDateIdx: index("transactionDate_idx").on(table.transactionDate),
}));

export type Revenue = typeof revenue.$inferSelect;
export type InsertRevenue = typeof revenue.$inferInsert;


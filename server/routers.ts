import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import crypto from "crypto";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= Gallery Management =============
  galleries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getGalleriesByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["google_photos", "local", "dropbox", "onedrive"]),
        credentials: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createGallery({
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          credentials: input.credentials,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const gallery = await db.getGalleryById(input.id);
        if (!gallery || gallery.userId !== ctx.user.id) {
          throw new Error("Gallery not found or unauthorized");
        }
        await db.deleteGallery(input.id);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "error", "syncing", "paused"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const gallery = await db.getGalleryById(input.id);
        if (!gallery || gallery.userId !== ctx.user.id) {
          throw new Error("Gallery not found or unauthorized");
        }
        await db.updateGalleryStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ============= Media Management =============
  media: router({
    list: protectedProcedure
      .input(z.object({
        isExplicit: z.boolean().optional(),
        isApproved: z.boolean().optional(),
        galleryId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getMediaItemsByUserId(ctx.user.id, input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const item = await db.getMediaItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Media item not found or unauthorized");
        }
        return item;
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const total = await db.countMediaItems(ctx.user.id);
      const explicit = await db.countMediaItems(ctx.user.id, { isExplicit: true });
      const approved = await db.countMediaItems(ctx.user.id, { isApproved: true });
      return { total, explicit, approved };
    }),

    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // base64 encoded
        galleryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileSize = buffer.length;
        
        // Generate hash for duplicate detection
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        
        // Check for duplicates
        const duplicates = await db.getMediaItemsByHash(hash);
        if (duplicates.length > 0) {
          return { success: false, error: "Duplicate file detected", duplicateId: duplicates[0].id };
        }
        
        // Generate unique storage key
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const fileKey = `${ctx.user.id}/media/${Date.now()}-${randomSuffix}-${input.filename}`;
        
        // Upload to S3
        const { url: storageUrl } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Create media item
        await db.createMediaItem({
          userId: ctx.user.id,
          galleryId: input.galleryId,
          storageKey: fileKey,
          storageUrl,
          filename: input.filename,
          mimeType: input.mimeType,
          fileSize,
          hash,
          aiAnalysisStatus: "pending",
        });
        
        return { success: true, url: storageUrl };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isExplicit: z.boolean().optional(),
        isApproved: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMediaItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Media item not found or unauthorized");
        }
        
        const { id, ...updates } = input;
        await db.updateMediaItem(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMediaItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Media item not found or unauthorized");
        }
        await db.deleteMediaItem(input.id);
        return { success: true };
      }),

    analyzeContent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMediaItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Media item not found or unauthorized");
        }
        
        // Update status to processing
        await db.updateMediaItem(input.id, { aiAnalysisStatus: "processing" });
        
        try {
          // Use LLM to analyze the image
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an AI that analyzes images for adult content. Provide a detailed analysis including NSFW score (0-100), whether it's explicit, and relevant tags."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Analyze this image for adult content. Provide: 1) NSFW score (0-100), 2) Is it explicit? (yes/no), 3) Relevant tags (comma-separated)" },
                  { type: "image_url", image_url: { url: item.storageUrl } }
                ]
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "content_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    nsfwScore: { type: "integer", description: "NSFW score from 0-100" },
                    isExplicit: { type: "boolean", description: "Whether the content is explicit" },
                    tags: { type: "array", items: { type: "string" }, description: "Relevant tags" },
                    description: { type: "string", description: "Brief description of the content" }
                  },
                  required: ["nsfwScore", "isExplicit", "tags", "description"],
                  additionalProperties: false
                }
              }
            }
          });
          
          const messageContent = response.choices[0].message.content;
          const analysis = JSON.parse(typeof messageContent === 'string' ? messageContent : "{}");
          
          // Update media item with analysis results
          await db.updateMediaItem(input.id, {
            aiAnalysisStatus: "completed",
            aiAnalysisResult: JSON.stringify(analysis),
            nsfwScore: analysis.nsfwScore,
            isExplicit: analysis.isExplicit,
          });
          
          // Add AI-generated tags
          for (const tagName of analysis.tags) {
            const tag = await db.getOrCreateTag(ctx.user.id, tagName, "ai_generated");
            await db.addTagToMedia(input.id, tag.id);
          }
          
          return { success: true, analysis };
        } catch (error) {
          await db.updateMediaItem(input.id, { aiAnalysisStatus: "failed" });
          throw error;
        }
      }),
  }),

  // ============= Category Management =============
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCategoriesByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        parentId: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createCategory({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateCategory(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),

    addMedia: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        mediaItemId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addMediaToCategory(input.mediaItemId, input.categoryId);
        return { success: true };
      }),

    removeMedia: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        mediaItemId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.removeMediaFromCategory(input.mediaItemId, input.categoryId);
        return { success: true };
      }),
  }),

  // ============= Tag Management =============
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTagsByUserId(ctx.user.id);
    }),

    addToMedia: protectedProcedure
      .input(z.object({
        mediaItemId: z.number(),
        tagName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tag = await db.getOrCreateTag(ctx.user.id, input.tagName, "manual");
        await db.addTagToMedia(input.mediaItemId, tag.id);
        return { success: true };
      }),

    removeFromMedia: protectedProcedure
      .input(z.object({
        mediaItemId: z.number(),
        tagId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.removeTagFromMedia(input.mediaItemId, input.tagId);
        return { success: true };
      }),

    getForMedia: protectedProcedure
      .input(z.object({ mediaItemId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getTagsForMedia(input.mediaItemId);
      }),
  }),

  // ============= Platform Management =============
  platforms: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPlatformsByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.string(),
        credentials: z.string().optional(),
        profileUrl: z.string().optional(),
        handle: z.string().optional(),
        bio: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createPlatform({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        credentials: z.string().optional(),
        profileUrl: z.string().optional(),
        handle: z.string().optional(),
        bio: z.string().optional(),
        status: z.enum(["active", "inactive", "error"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const platform = await db.getPlatformById(input.id);
        if (!platform || platform.userId !== ctx.user.id) {
          throw new Error("Platform not found or unauthorized");
        }
        
        const { id, ...updates } = input;
        await db.updatePlatform(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const platform = await db.getPlatformById(input.id);
        if (!platform || platform.userId !== ctx.user.id) {
          throw new Error("Platform not found or unauthorized");
        }
        await db.deletePlatform(input.id);
        return { success: true };
      }),
  }),

  // ============= Upload Queue Management =============
  uploadQueue: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "processing", "completed", "failed", "scheduled"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUploadQueueByUserId(ctx.user.id, input.status);
      }),

    create: protectedProcedure
      .input(z.object({
        mediaItemId: z.number(),
        platformId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        scheduledAt: z.date().optional(),
        customMetadata: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createUploadQueueItem({
          userId: ctx.user.id,
          ...input,
          status: input.scheduledAt ? "scheduled" : "pending",
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed", "scheduled"]).optional(),
        platformPostId: z.string().optional(),
        platformUrl: z.string().optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getUploadQueueItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Upload queue item not found or unauthorized");
        }
        
        const { id, ...updates } = input;
        await db.updateUploadQueueItem(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getUploadQueueItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Upload queue item not found or unauthorized");
        }
        await db.deleteUploadQueueItem(input.id);
        return { success: true };
      }),
  }),

  // ============= Revenue Tracking =============
  revenue: router({
    list: protectedProcedure
      .input(z.object({
        platformId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getRevenueByUserId(ctx.user.id, input);
      }),

    total: protectedProcedure
      .input(z.object({
        platformId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getTotalRevenue(ctx.user.id, input);
      }),

    create: protectedProcedure
      .input(z.object({
        platformId: z.number(),
        uploadQueueId: z.number().optional(),
        amount: z.number(),
        currency: z.string().default("USD"),
        transactionType: z.enum(["sale", "subscription", "tip", "other"]),
        transactionDate: z.date(),
        platformTransactionId: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createRevenue({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;


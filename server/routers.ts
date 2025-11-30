import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { analyzeAdultContent } from "./contentAnalyzer";
import { startImportJob, stopImportJob } from "./importProcessor";
import { getPlatformAdapter, listAvailablePlatforms } from "./platformAdapters";
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
        
        // Create media item with pending analysis
        const result = await db.createMediaItem({
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
        
        const mediaId = Number(result[0].insertId);
        
        // Automatically analyze content with AI (async, don't wait)
        analyzeAdultContent(storageUrl)
          .then(async (analysis) => {
            // Update media item with analysis results
            await db.updateMediaItem(mediaId, {
              isExplicit: analysis.isExplicit,
              nsfwScore: analysis.explicitLevel,
              aiAnalysisResult: JSON.stringify(analysis),
              aiAnalysisStatus: "completed",
            });
            
            // Auto-create and assign categories
            for (const categoryName of analysis.categories) {
              // Check if category exists
              const categories = await db.getCategoriesByUserId(ctx.user.id);
              let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
              
              // Create if doesn't exist
              if (!category) {
                await db.createCategory({ userId: ctx.user.id, name: categoryName });
                const updated = await db.getCategoriesByUserId(ctx.user.id);
                category = updated.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
              }
              
              if (category) {
                await db.addMediaToCategory(mediaId, category.id).catch(() => {});
              }
            }
            
            // Auto-create and assign tags
            for (const tagName of analysis.tags) {
              const tag = await db.getOrCreateTag(ctx.user.id, tagName, "ai_generated");
              await db.addTagToMedia(mediaId, tag.id).catch(() => {});
            }
          })
          .catch((error) => {
            console.error("Auto-analysis failed for media", mediaId, error);
            db.updateMediaItem(mediaId, { aiAnalysisStatus: "failed" });
          });
        
        return { success: true, url: storageUrl, mediaId };
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

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMediaItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Media item not found or unauthorized");
        }
        await db.updateMediaItem(input.id, { isApproved: true });
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

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tag = await db.getOrCreateTag(ctx.user.id, input.name, "manual");
        return { success: true, tag };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTag(input.id);
        return { success: true };
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

    listAvailable: publicProcedure.query(() => {
      return listAvailablePlatforms();
    }),

    testConnection: protectedProcedure
      .input(z.object({
        platformType: z.string(),
        credentials: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const adapter = getPlatformAdapter(input.platformType);
        const isValid = await adapter.validateCredentials(input.credentials);
        return { success: isValid, message: isValid ? "Connection successful" : "Invalid credentials" };
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

    processUpload: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getUploadQueueItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Upload queue item not found or unauthorized");
        }

        // Get media item and platform
        const media = await db.getMediaItemById(item.mediaItemId);
        const platform = await db.getPlatformById(item.platformId);

        if (!media || !platform) {
          throw new Error("Media or platform not found");
        }

        // Update status to processing
        await db.updateUploadQueueItem(input.id, { status: "processing" });

        try {
          // Get platform adapter
          const adapter = getPlatformAdapter(platform.type);

          // Parse credentials
          const credentials = platform.credentials ? JSON.parse(platform.credentials) : {};

          // Prepare metadata
          const metadata = {
            title: item.title || media.filename,
            description: item.description || "",
            tags: [], // Could extract from media tags
            ...(item.customMetadata ? JSON.parse(item.customMetadata) : {}),
          };

          // Upload to platform
          const result = await adapter.upload(media.storageUrl, metadata, credentials);

          if (result.success) {
            await db.updateUploadQueueItem(input.id, {
              status: "completed",
              platformPostId: result.platformId,
              platformUrl: result.platformUrl,
              uploadedAt: new Date(),
            });
            return { success: true, platformUrl: result.platformUrl };
          } else {
            await db.updateUploadQueueItem(input.id, {
              status: "failed",
              errorMessage: result.error,
            });
            return { success: false, error: result.error };
          }
        } catch (error: any) {
          await db.updateUploadQueueItem(input.id, {
            status: "failed",
            errorMessage: error.message,
          });
          return { success: false, error: error.message };
        }
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

  // ============= Import Jobs =============
  importJobs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getImportJobsByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await db.getImportJobById(input.id);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Import job not found or unauthorized");
        }
        return job;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        galleryId: z.number().optional(),
        sourceType: z.enum(["google_drive", "url", "local_folder"]),
        sourcePath: z.string(),
        filters: z.object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          minSize: z.number().optional(),
          maxSize: z.number().optional(),
          fileTypes: z.array(z.string()).optional(),
        }).optional(),
        autoCategories: z.array(z.number()).optional(),
        autoTags: z.array(z.number()).optional(),
        isRecurring: z.boolean().default(false),
        schedule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createImportJob({
          userId: ctx.user.id,
          name: input.name,
          galleryId: input.galleryId,
          sourceType: input.sourceType,
          sourcePath: input.sourcePath,
          filters: input.filters ? JSON.stringify(input.filters) : null,
          autoCategories: input.autoCategories ? JSON.stringify(input.autoCategories) : null,
          autoTags: input.autoTags ? JSON.stringify(input.autoTags) : null,
          isRecurring: input.isRecurring,
          schedule: input.schedule,
          status: "pending",
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["pending", "running", "completed", "failed", "paused"]).optional(),
        filters: z.object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          minSize: z.number().optional(),
          maxSize: z.number().optional(),
          fileTypes: z.array(z.string()).optional(),
        }).optional(),
        autoCategories: z.array(z.number()).optional(),
        autoTags: z.array(z.number()).optional(),
        isRecurring: z.boolean().optional(),
        schedule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getImportJobById(input.id);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Import job not found or unauthorized");
        }

        const updates: any = {};
        if (input.name) updates.name = input.name;
        if (input.status) updates.status = input.status;
        if (input.filters) updates.filters = JSON.stringify(input.filters);
        if (input.autoCategories) updates.autoCategories = JSON.stringify(input.autoCategories);
        if (input.autoTags) updates.autoTags = JSON.stringify(input.autoTags);
        if (input.isRecurring !== undefined) updates.isRecurring = input.isRecurring;
        if (input.schedule) updates.schedule = input.schedule;

        await db.updateImportJob(input.id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getImportJobById(input.id);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Import job not found or unauthorized");
        }
        await db.deleteImportJob(input.id);
        return { success: true };
      }),

    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getImportJobById(input.id);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Import job not found or unauthorized");
        }
        
        // Start background processor
        const result = await startImportJob(input.id, ctx.user.id);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;


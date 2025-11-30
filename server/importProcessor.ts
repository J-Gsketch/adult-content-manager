import * as db from "./db";
import { storagePut } from "./storage";
import { analyzeAdultContent } from "./contentAnalyzer";
import crypto from "crypto";
import axios from "axios";

interface ImportJobConfig {
  jobId: number;
  userId: number;
}

/**
 * Background processor for import jobs
 * Fetches files from various sources and processes them
 */
export class ImportJobProcessor {
  public jobId: number;
  public userId: number;
  private isRunning: boolean = false;

  constructor({ jobId, userId }: ImportJobConfig) {
    this.jobId = jobId;
    this.userId = userId;
  }

  async start() {
    if (this.isRunning) {
      console.log(`Import job ${this.jobId} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`Starting import job ${this.jobId}`);

    try {
      // Update job status to running
      await db.updateImportJob(this.jobId, {
        status: "running",
        lastRunAt: new Date(),
      });

      // Get job details
      const job = await db.getImportJobById(this.jobId);
      if (!job) {
        throw new Error("Import job not found");
      }

      // Fetch files based on source type
      let fileUrls: string[] = [];
      
      if (job.sourceType === "url") {
        fileUrls = await this.fetchFromUrl(job.sourcePath);
      } else if (job.sourceType === "google_drive") {
        fileUrls = await this.fetchFromGoogleDrive(job.sourcePath);
      } else if (job.sourceType === "local_folder") {
        fileUrls = await this.fetchFromLocalFolder(job.sourcePath);
      }

      // Update total items count
      await db.updateImportJob(this.jobId, {
        totalItems: fileUrls.length,
      });

      // Process each file
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      for (const fileUrl of fileUrls) {
        try {
          const result = await this.processFile(fileUrl, job.galleryId ?? undefined);
          
          if (result.duplicate) {
            duplicateCount++;
          } else if (result.success) {
            successCount++;
          } else {
            failCount++;
          }

          // Update progress
          await db.updateImportJob(this.jobId, {
            processedItems: successCount + failCount + duplicateCount,
            successfulItems: successCount,
            failedItems: failCount,
            duplicateItems: duplicateCount,
          });
        } catch (error) {
          console.error(`Failed to process file ${fileUrl}:`, error);
          failCount++;
        }
      }

      // Mark job as completed
      await db.updateImportJob(this.jobId, {
        status: "completed",
        completedAt: new Date(),
      });

      console.log(`Import job ${this.jobId} completed: ${successCount} success, ${failCount} failed, ${duplicateCount} duplicates`);
    } catch (error: any) {
      console.error(`Import job ${this.jobId} failed:`, error);
      
      await db.updateImportJob(this.jobId, {
        status: "failed",
        errorMessage: error.message,
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async fetchFromUrl(sourcePath: string): Promise<string[]> {
    // For now, treat the URL as a single file
    // In the future, this could parse album pages and extract all image URLs
    return [sourcePath];
  }

  private async fetchFromGoogleDrive(folderId: string): Promise<string[]> {
    // Google Drive integration would require OAuth setup
    // For now, return empty array with a note to implement
    console.warn("Google Drive integration requires OAuth setup");
    return [];
  }

  private async fetchFromLocalFolder(folderPath: string): Promise<string[]> {
    // Local folder access would require file system permissions
    // This is more suitable for server-side deployments
    console.warn("Local folder import not yet implemented");
    return [];
  }

  private async processFile(
    fileUrl: string,
    galleryId?: number
  ): Promise<{ success: boolean; duplicate: boolean }> {
    try {
      // Download file
      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);
      const fileSize = buffer.length;

      // Get filename from URL or generate one
      const urlParts = fileUrl.split("/");
      const filename = urlParts[urlParts.length - 1] || `imported-${Date.now()}.jpg`;

      // Determine MIME type
      const contentType = response.headers["content-type"] || "image/jpeg";

      // Generate hash for duplicate detection
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Check for duplicates
      const duplicates = await db.getMediaItemsByHash(hash);
      if (duplicates.length > 0) {
        return { success: false, duplicate: true };
      }

      // Generate unique storage key
      const randomSuffix = crypto.randomBytes(8).toString("hex");
      const fileKey = `${this.userId}/media/${Date.now()}-${randomSuffix}-${filename}`;

      // Upload to S3
      const { url: storageUrl } = await storagePut(fileKey, buffer, contentType);

      // Create media item
      const result = await db.createMediaItem({
        userId: this.userId,
        galleryId,
        originalUrl: fileUrl,
        storageKey: fileKey,
        storageUrl,
        filename,
        mimeType: contentType,
        fileSize,
        hash,
        aiAnalysisStatus: "pending",
      });

      const mediaId = Number(result[0].insertId);

      // Automatically analyze content with AI (async)
      analyzeAdultContent(storageUrl)
        .then(async (analysis) => {
          await db.updateMediaItem(mediaId, {
            isExplicit: analysis.isExplicit,
            nsfwScore: analysis.explicitLevel,
            aiAnalysisResult: JSON.stringify(analysis),
            aiAnalysisStatus: "completed",
          });

          // Auto-create and assign categories
          for (const categoryName of analysis.categories) {
            const categories = await db.getCategoriesByUserId(this.userId);
            let category = categories.find(
              (c) => c.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (!category) {
              await db.createCategory({ userId: this.userId, name: categoryName });
              const updated = await db.getCategoriesByUserId(this.userId);
              category = updated.find(
                (c) => c.name.toLowerCase() === categoryName.toLowerCase()
              );
            }

            if (category) {
              await db.addMediaToCategory(mediaId, category.id).catch(() => {});
            }
          }

          // Auto-create and assign tags
          for (const tagName of analysis.tags) {
            const tag = await db.getOrCreateTag(this.userId, tagName, "ai_generated");
            await db.addTagToMedia(mediaId, tag.id).catch(() => {});
          }
        })
        .catch((error) => {
          console.error("Auto-analysis failed for media", mediaId, error);
          db.updateMediaItem(mediaId, { aiAnalysisStatus: "failed" });
        });

      return { success: true, duplicate: false };
    } catch (error) {
      console.error("Failed to process file:", error);
      return { success: false, duplicate: false };
    }
  }

  stop() {
    this.isRunning = false;
    console.log(`Stopping import job ${this.jobId}`);
  }
}

/**
 * Global registry of running import jobs
 */
const runningJobs = new Map<number, ImportJobProcessor>();

/**
 * Start an import job
 */
export async function startImportJob(jobId: number, userId: number) {
  if (runningJobs.has(jobId)) {
    console.log(`Import job ${jobId} is already running`);
    return;
  }

  const processor = new ImportJobProcessor({ jobId, userId });
  runningJobs.set(jobId, processor);

  // Start processing (don't await - run in background)
  processor.start().finally(() => {
    runningJobs.delete(jobId);
  });

  return { success: true, message: "Import job started" };
}

/**
 * Stop an import job
 */
export async function stopImportJob(jobId: number) {
  const processor = runningJobs.get(jobId);
  if (processor) {
    processor.stop();
    runningJobs.delete(jobId);
    await db.updateImportJob(jobId, { status: "paused" });
    return { success: true, message: "Import job stopped" };
  }
  return { success: false, message: "Import job not running" };
}

/**
 * Get status of all running jobs
 */
export function getRunningJobs() {
  return Array.from(runningJobs.keys());
}

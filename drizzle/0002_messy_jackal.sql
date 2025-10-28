CREATE TABLE `import_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`galleryId` int,
	`name` varchar(255) NOT NULL,
	`sourceType` enum('google_drive','url','local_folder') NOT NULL,
	`sourcePath` text NOT NULL,
	`status` enum('pending','running','completed','failed','paused') NOT NULL DEFAULT 'pending',
	`filters` text,
	`autoCategories` text,
	`autoTags` text,
	`totalItems` int DEFAULT 0,
	`processedItems` int DEFAULT 0,
	`successfulItems` int DEFAULT 0,
	`failedItems` int DEFAULT 0,
	`duplicateItems` int DEFAULT 0,
	`isRecurring` boolean DEFAULT false,
	`schedule` varchar(100),
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `import_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `import_jobs` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `import_jobs` (`status`);
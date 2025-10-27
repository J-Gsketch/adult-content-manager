CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`parentId` int,
	`color` varchar(7),
	`icon` varchar(50),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `galleries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('google_photos','local','dropbox','onedrive') NOT NULL,
	`credentials` text,
	`lastSyncAt` timestamp,
	`status` enum('active','error','syncing','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `galleries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaItemId` int NOT NULL,
	`categoryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`galleryId` int,
	`originalUrl` text,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`thumbnailKey` varchar(512),
	`thumbnailUrl` text,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int,
	`width` int,
	`height` int,
	`duration` int,
	`hash` varchar(64),
	`aiAnalysisStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`aiAnalysisResult` text,
	`nsfwScore` int,
	`isExplicit` boolean NOT NULL DEFAULT false,
	`isApproved` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaItemId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL,
	`credentials` text,
	`profileUrl` varchar(512),
	`handle` varchar(100),
	`bio` text,
	`status` enum('active','inactive','error') NOT NULL DEFAULT 'active',
	`lastUploadAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platformId` int NOT NULL,
	`uploadQueueId` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`transactionType` enum('sale','subscription','tip','other') NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`platformTransactionId` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('manual','ai_generated','platform') NOT NULL DEFAULT 'manual',
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mediaItemId` int NOT NULL,
	`platformId` int NOT NULL,
	`status` enum('pending','processing','completed','failed','scheduled') NOT NULL DEFAULT 'pending',
	`scheduledAt` timestamp,
	`uploadedAt` timestamp,
	`platformPostId` varchar(255),
	`platformUrl` text,
	`title` varchar(255),
	`description` text,
	`price` int,
	`customMetadata` text,
	`errorMessage` text,
	`retryCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upload_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `categories` (`userId`);--> statement-breakpoint
CREATE INDEX `parentId_idx` ON `categories` (`parentId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `galleries` (`userId`);--> statement-breakpoint
CREATE INDEX `mediaItemId_idx` ON `media_categories` (`mediaItemId`);--> statement-breakpoint
CREATE INDEX `categoryId_idx` ON `media_categories` (`categoryId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `media_items` (`userId`);--> statement-breakpoint
CREATE INDEX `galleryId_idx` ON `media_items` (`galleryId`);--> statement-breakpoint
CREATE INDEX `hash_idx` ON `media_items` (`hash`);--> statement-breakpoint
CREATE INDEX `isExplicit_idx` ON `media_items` (`isExplicit`);--> statement-breakpoint
CREATE INDEX `isApproved_idx` ON `media_items` (`isApproved`);--> statement-breakpoint
CREATE INDEX `mediaItemId_idx` ON `media_tags` (`mediaItemId`);--> statement-breakpoint
CREATE INDEX `tagId_idx` ON `media_tags` (`tagId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `platforms` (`userId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `revenue` (`userId`);--> statement-breakpoint
CREATE INDEX `platformId_idx` ON `revenue` (`platformId`);--> statement-breakpoint
CREATE INDEX `uploadQueueId_idx` ON `revenue` (`uploadQueueId`);--> statement-breakpoint
CREATE INDEX `transactionDate_idx` ON `revenue` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `tags` (`userId`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `upload_queue` (`userId`);--> statement-breakpoint
CREATE INDEX `mediaItemId_idx` ON `upload_queue` (`mediaItemId`);--> statement-breakpoint
CREATE INDEX `platformId_idx` ON `upload_queue` (`platformId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `upload_queue` (`status`);
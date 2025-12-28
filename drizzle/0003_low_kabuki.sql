CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pushEnabled` int NOT NULL DEFAULT 1,
	`emailEnabled` int NOT NULL DEFAULT 1,
	`contentApproved` int NOT NULL DEFAULT 1,
	`contentUploaded` int NOT NULL DEFAULT 1,
	`revenueMilestone` int NOT NULL DEFAULT 1,
	`importComplete` int NOT NULL DEFAULT 1,
	`uploadFailed` int NOT NULL DEFAULT 1,
	`pushSubscription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('content_approved','content_uploaded','revenue_milestone','import_complete','upload_failed','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`actionUrl` varchar(512),
	`isRead` int NOT NULL DEFAULT 0,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `notification_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `isRead_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `notifications` (`createdAt`);
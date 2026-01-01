ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` varchar(50);
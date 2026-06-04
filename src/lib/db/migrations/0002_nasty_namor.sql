DROP TABLE `otp_rate_limits`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `users` ADD `clerk_user_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email` text(320);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_user_id_unique` ON `users` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone_verified_at`;
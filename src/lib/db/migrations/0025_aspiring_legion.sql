CREATE TABLE `announcement_acknowledgments` (
	`announcement_id` text NOT NULL,
	`user_id` text NOT NULL,
	`acknowledged_at` text NOT NULL,
	PRIMARY KEY(`announcement_id`, `user_id`),
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `announcement_acknowledgments_user_idx` ON `announcement_acknowledgments` (`user_id`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`screenshot_url` text,
	`created_by_user_id` text,
	`published_at` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `announcements_published_at_idx` ON `announcements` (`published_at`);
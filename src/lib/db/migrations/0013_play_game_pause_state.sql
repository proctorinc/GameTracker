ALTER TABLE `games` ADD `paused_at` text;--> statement-breakpoint
ALTER TABLE `games` ADD `paused_next_user_id` text REFERENCES `users`(`id`) ON DELETE set null;--> statement-breakpoint

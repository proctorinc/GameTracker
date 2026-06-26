CREATE TABLE `game_join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`requester_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by_user_id` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requester_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `game_join_requests_game_status_idx` ON `game_join_requests` (`game_id`,`status`);--> statement-breakpoint
CREATE INDEX `game_join_requests_requester_status_idx` ON `game_join_requests` (`requester_user_id`,`status`);--> statement-breakpoint
ALTER TABLE `games` ADD `share_token` text;--> statement-breakpoint
ALTER TABLE `games` ADD `invite_users_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `games_share_token_unique` ON `games` (`share_token`);

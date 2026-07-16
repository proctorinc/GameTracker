CREATE TABLE `user_game_title_preferences` (
	`user_id` text NOT NULL,
	`game_title_id` text NOT NULL,
	`game_specific_settings_json` text,
	`default_player_role` text DEFAULT 'player' NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `game_title_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_title_id`) REFERENCES `game_title`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `game_players` ADD `role` text;--> statement-breakpoint
ALTER TABLE `games` ADD `game_specific_settings_json` text;--> statement-breakpoint
ALTER TABLE `games` ADD `default_player_role` text;
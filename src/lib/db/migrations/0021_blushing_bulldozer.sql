CREATE TABLE `user_game_title_settings` (
	`user_id` text NOT NULL,
	`game_title_id` text NOT NULL,
	`settings_version` text NOT NULL,
	`settings_json` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `game_title_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_title_id`) REFERENCES `game_title`(`id`) ON UPDATE no action ON DELETE cascade
);

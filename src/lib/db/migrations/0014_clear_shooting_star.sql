CREATE TABLE `game_eliminations` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`eliminated_user_id` text NOT NULL,
	`placement` integer NOT NULL,
	`round_number` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eliminated_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_eliminations_placement_positive" CHECK("game_eliminations"."placement" > 0)
);
--> statement-breakpoint
CREATE TABLE `game_itemized_score_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`value` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_itemized_score_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `game_itemized_score_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_itemized_score_entries_quantity_non_negative" CHECK("game_itemized_score_entries"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE `game_title` ADD `default_settings_version` text;--> statement-breakpoint
ALTER TABLE `game_title` ADD `default_settings_json` text;--> statement-breakpoint
ALTER TABLE `games` ADD `settings_json` text;
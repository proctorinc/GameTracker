ALTER TABLE `card_drops` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `card_drops` ADD `opened_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `card_drops_user_game_deck_unique` ON `card_drops` (`user_id`,`game_id`,`deck_id`);
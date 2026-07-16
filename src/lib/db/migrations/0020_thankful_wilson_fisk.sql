CREATE TABLE `card_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_name` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`rarity` text NOT NULL,
	`renderer` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deck_name`) REFERENCES `decks`(`name`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_templates_deck_slug_unique` ON `card_templates` (`deck_name`,`slug`);--> statement-breakpoint
CREATE INDEX `card_templates_deck_sort_idx` ON `card_templates` (`deck_name`,`sort_order`);--> statement-breakpoint
ALTER TABLE `cards` ADD `card_template_id` text REFERENCES card_templates(id);--> statement-breakpoint
ALTER TABLE `cards` ADD `rarity` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `subject_type` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `subject_id` text;--> statement-breakpoint
CREATE INDEX `cards_owner_deck_idx` ON `cards` (`owner_id`,`deck_name`);--> statement-breakpoint
CREATE INDEX `cards_template_subject_idx` ON `cards` (`card_template_id`,`subject_id`);--> statement-breakpoint
ALTER TABLE `decks` ADD `label` text DEFAULT 'Deck' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `pack_size` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `common_odds` integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `uncommon_odds` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `rare_odds` integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `legendary_odds` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `created_at` text DEFAULT '1970-01-01T00:00:00.000Z' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `updated_at` text DEFAULT '1970-01-01T00:00:00.000Z' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_title` ADD `reward_deck_name` text REFERENCES decks(name);
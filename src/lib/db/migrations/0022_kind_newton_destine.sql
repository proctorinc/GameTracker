ALTER TABLE `decks` ADD `back_style` text DEFAULT 'geometric' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `back_primary_color` text DEFAULT '#4f46e5' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `back_secondary_color` text DEFAULT '#0f172a' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `back_accent_color` text DEFAULT '#f8fafc' NOT NULL;
ALTER TABLE `game_title` ADD `custom_play_screen_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `custom_play_state_json` text;
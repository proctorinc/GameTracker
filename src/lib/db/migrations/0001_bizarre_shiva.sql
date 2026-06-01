ALTER TABLE `game_title` ADD `default_track_rounds` integer;--> statement-breakpoint
ALTER TABLE `games` ADD `track_rounds` integer DEFAULT false NOT NULL;
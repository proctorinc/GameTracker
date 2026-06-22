CREATE TABLE `game_player_rank_results` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`game_completed_at` text NOT NULL,
	`player_count` integer NOT NULL,
	`placement` integer NOT NULL,
	`tie_size` integer NOT NULL,
	`rank_config_id` text NOT NULL,
	`prize_pool_minor` integer NOT NULL,
	`payout_percent_bps` integer NOT NULL,
	`points_awarded_minor` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rank_config_id`) REFERENCES `player_rank_configs`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "game_player_rank_results_player_count_positive" CHECK("game_player_rank_results"."player_count" > 0),
	CONSTRAINT "game_player_rank_results_placement_positive" CHECK("game_player_rank_results"."placement" > 0),
	CONSTRAINT "game_player_rank_results_tie_size_positive" CHECK("game_player_rank_results"."tie_size" > 0),
	CONSTRAINT "game_player_rank_results_prize_pool_minor_non_negative" CHECK("game_player_rank_results"."prize_pool_minor" >= 0),
	CONSTRAINT "game_player_rank_results_payout_percent_bps_non_negative" CHECK("game_player_rank_results"."payout_percent_bps" >= 0),
	CONSTRAINT "game_player_rank_results_points_awarded_minor_non_negative" CHECK("game_player_rank_results"."points_awarded_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE `game_result_placements` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`placement` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_result_placements_placement_range" CHECK("game_result_placements"."placement" >= 1 AND "game_result_placements"."placement" <= 3)
);
--> statement-breakpoint
CREATE TABLE `player_rank_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text DEFAULT 'v1' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`window_months` integer DEFAULT 6 NOT NULL,
	`default_max_prize_pool` integer NOT NULL,
	`prize_pool_by_player_count_json` text NOT NULL,
	`small_game_distribution_json` text NOT NULL,
	`large_game_distribution_json` text NOT NULL,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "player_rank_configs_window_months_positive" CHECK("player_rank_configs"."window_months" > 0),
	CONSTRAINT "player_rank_configs_default_max_prize_pool_non_negative" CHECK("player_rank_configs"."default_max_prize_pool" >= 0)
);
--> statement-breakpoint
CREATE TABLE `player_rank_history` (
	`user_id` text NOT NULL,
	`history_date` text NOT NULL,
	`player_rank_position` integer,
	`player_rank_total_minor` integer NOT NULL,
	`player_rank_games_count` integer NOT NULL,
	`top_three_finishes` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `history_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_rank_history_total_minor_non_negative" CHECK("player_rank_history"."player_rank_total_minor" >= 0),
	CONSTRAINT "player_rank_history_games_count_non_negative" CHECK("player_rank_history"."player_rank_games_count" >= 0),
	CONSTRAINT "player_rank_history_top_three_non_negative" CHECK("player_rank_history"."top_three_finishes" >= 0),
	CONSTRAINT "player_rank_history_position_positive" CHECK("player_rank_history"."player_rank_position" IS NULL OR "player_rank_history"."player_rank_position" > 0)
);
--> statement-breakpoint
CREATE INDEX `player_rank_history_history_date_idx` ON `player_rank_history` (`history_date`);--> statement-breakpoint
CREATE INDEX `player_rank_history_user_history_date_idx` ON `player_rank_history` (`user_id`,`history_date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`invitee_user_id` text,
	`invite_token` text,
	`guest_user_id` text,
	`kind` text DEFAULT 'friend' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`accepted_by_user_id` text,
	`accepted_at` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`guest_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "invitations_target_fields_check" CHECK((
      ("__new_invitations"."target_type" = 'user' AND "__new_invitations"."invitee_user_id" IS NOT NULL AND "__new_invitations"."invite_token" IS NULL) OR
      ("__new_invitations"."target_type" = 'link' AND "__new_invitations"."invite_token" IS NOT NULL)
    ))
);
--> statement-breakpoint
INSERT INTO `__new_invitations`("id", "inviter_user_id", "target_type", "invitee_user_id", "invite_token", "guest_user_id", "kind", "status", "accepted_by_user_id", "accepted_at", "expires_at", "created_at", "updated_at") SELECT "id", "inviter_user_id", "target_type", "invitee_user_id", "invite_token", "guest_user_id", "kind", "status", "accepted_by_user_id", "accepted_at", "expires_at", "created_at", "updated_at" FROM `invitations`;--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `__new_invitations` RENAME TO `invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_invite_token_unique` ON `invitations` (`invite_token`);--> statement-breakpoint
DROP INDEX `users_phone_number_unique`;--> statement-breakpoint
ALTER TABLE `users` ADD `friend_invite_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `player_rank_leaderboard_disabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_friend_invite_token_unique` ON `users` (`friend_invite_token`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone_number`;
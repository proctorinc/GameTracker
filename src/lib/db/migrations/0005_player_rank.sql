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
  CONSTRAINT `player_rank_configs_window_months_positive` CHECK(`player_rank_configs`.`window_months` > 0),
  CONSTRAINT `player_rank_configs_default_max_prize_pool_non_negative` CHECK(`player_rank_configs`.`default_max_prize_pool` >= 0)
);
--> statement-breakpoint
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
  CONSTRAINT `game_player_rank_results_player_count_positive` CHECK(`game_player_rank_results`.`player_count` > 0),
  CONSTRAINT `game_player_rank_results_placement_positive` CHECK(`game_player_rank_results`.`placement` > 0),
  CONSTRAINT `game_player_rank_results_tie_size_positive` CHECK(`game_player_rank_results`.`tie_size` > 0),
  CONSTRAINT `game_player_rank_results_prize_pool_minor_non_negative` CHECK(`game_player_rank_results`.`prize_pool_minor` >= 0),
  CONSTRAINT `game_player_rank_results_payout_percent_bps_non_negative` CHECK(`game_player_rank_results`.`payout_percent_bps` >= 0),
  CONSTRAINT `game_player_rank_results_points_awarded_minor_non_negative` CHECK(`game_player_rank_results`.`points_awarded_minor` >= 0)
);
--> statement-breakpoint
INSERT INTO `player_rank_configs` (
  `id`,
  `version`,
  `is_active`,
  `window_months`,
  `default_max_prize_pool`,
  `prize_pool_by_player_count_json`,
  `small_game_distribution_json`,
  `large_game_distribution_json`,
  `created_by_user_id`,
  `created_at`
) VALUES (
  'player_rank_default_v1',
  'v1',
  true,
  6,
  40000,
  '{"2":5000,"3":10000,"4":20000,"5":30000}',
  '{"2":[10000,0,0],"3":[10000,0,0]}',
  '[6000,3000,1000]',
  NULL,
  CURRENT_TIMESTAMP
);

CREATE TABLE `player_rank_history` (
  `user_id` text NOT NULL,
  `history_date` text NOT NULL,
  `player_rank_position` integer,
  `player_rank_total_minor` integer NOT NULL,
  `player_rank_games_count` integer NOT NULL,
  `top_three_finishes` integer NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`user_id`, `history_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT "player_rank_history_total_minor_non_negative" CHECK(`player_rank_total_minor` >= 0),
  CONSTRAINT "player_rank_history_games_count_non_negative" CHECK(`player_rank_games_count` >= 0),
  CONSTRAINT "player_rank_history_top_three_non_negative" CHECK(`top_three_finishes` >= 0),
  CONSTRAINT "player_rank_history_position_positive" CHECK(`player_rank_position` IS NULL OR `player_rank_position` > 0)
);
--> statement-breakpoint
CREATE INDEX `player_rank_history_history_date_idx` ON `player_rank_history` (`history_date`);
--> statement-breakpoint
CREATE INDEX `player_rank_history_user_history_date_idx` ON `player_rank_history` (`user_id`, `history_date`);

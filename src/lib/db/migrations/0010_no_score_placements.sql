CREATE TABLE `game_result_placements` (
  `game_id` text NOT NULL,
  `user_id` text NOT NULL,
  `placement` integer NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY(`game_id`, `user_id`),
  FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `game_result_placements_placement_range` CHECK(`game_result_placements`.`placement` >= 1 AND `game_result_placements`.`placement` <= 3)
);
--> statement-breakpoint
INSERT INTO `game_result_placements` (`game_id`, `user_id`, `placement`, `created_at`)
SELECT `game_id`, `user_id`, 1, `created_at`
FROM `game_winners`
WHERE NOT EXISTS (
  SELECT 1
  FROM `game_result_placements`
  WHERE `game_result_placements`.`game_id` = `game_winners`.`game_id`
    AND `game_result_placements`.`user_id` = `game_winners`.`user_id`
);

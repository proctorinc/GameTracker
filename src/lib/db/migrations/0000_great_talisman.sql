CREATE TABLE `card_drops` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text,
	`card_count` integer DEFAULT 1 NOT NULL,
	`deck_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`name`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`deck_name` text NOT NULL,
	`value` integer NOT NULL,
	`suit` text NOT NULL,
	`weight` integer NOT NULL,
	`modifier` text DEFAULT 'Basic' NOT NULL,
	`exact_pull_chance` integer NOT NULL,
	`generic_pull_chance` integer NOT NULL,
	`created_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_name`) REFERENCES `decks`(`name`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`name` text PRIMARY KEY NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`user1_id` text NOT NULL,
	`user2_id` text NOT NULL,
	`inviter_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user1_id`, `user2_id`),
	FOREIGN KEY (`user1_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user2_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` text PRIMARY KEY NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_round_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`game_round_id` text NOT NULL,
	`user_id` text NOT NULL,
	`score_delta` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_round_id`) REFERENCES `game_rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_round_score_non_null" CHECK("game_round_scores"."score_delta" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `game_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_title` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`color` text DEFAULT '#475569' NOT NULL,
	`image_url` text DEFAULT '/images/skyjo.png' NOT NULL,
	`default_scoring_mode` text,
	`default_ending_mode` text,
	`default_target_rounds` integer,
	`default_score_threshold` integer,
	`default_score_threshold_direction` text,
	`is_universal` integer DEFAULT false NOT NULL,
	`created_by_user_id` text,
	`merged_into_game_title_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`merged_into_game_title_id`) REFERENCES `game_title`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_title_normalized_title_unique` ON `game_title` (`normalized_title`);--> statement-breakpoint
CREATE TABLE `game_winners` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`game_title_id` text,
	`version` text DEFAULT 'v1' NOT NULL,
	`creator_id` text NOT NULL,
	`scoring_mode` text DEFAULT 'lowest_wins' NOT NULL,
	`ending_mode` text DEFAULT 'none' NOT NULL,
	`target_rounds` integer,
	`score_threshold` integer,
	`score_threshold_direction` text,
	`completed_rounds` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`game_title_id`) REFERENCES `game_title`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`invitee_user_id` text,
	`invitee_phone_number` text(20),
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
      ("invitations"."target_type" = 'user' AND "invitations"."invitee_user_id" IS NOT NULL AND "invitations"."invitee_phone_number" IS NULL AND "invitations"."invite_token" IS NULL) OR
      ("invitations"."target_type" = 'phone' AND "invitations"."invitee_user_id" IS NULL AND "invitations"."invitee_phone_number" IS NOT NULL AND "invitations"."invite_token" IS NULL) OR
      ("invitations"."target_type" = 'link' AND "invitations"."invitee_phone_number" IS NULL AND "invitations"."invite_token" IS NOT NULL)
    ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_invite_token_unique` ON `invitations` (`invite_token`);--> statement-breakpoint
CREATE TABLE `otp_rate_limits` (
	`phone` text(20) PRIMARY KEY NOT NULL,
	`last_request_at` text,
	`request_count_window` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text(65),
	`expires_at` text,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `user_game_title` (
	`user_id` text NOT NULL,
	`game_title_id` text NOT NULL,
	`source` text NOT NULL,
	`source_game_id` text,
	`acquired_from_user_id` text,
	`acquired_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `game_title_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_title_id`) REFERENCES `game_title`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`acquired_from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_card_id` text,
	`color` text DEFAULT '#FFFFFF' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`phone_number` text(20),
	`first_name` text,
	`last_name` text,
	`phone_verified_at` text,
	`created_by_user_id` text,
	`merged_into_user_id` text,
	`merged_at` text,
	`is_profile_complete` integer DEFAULT false NOT NULL,
	`is_guest` integer DEFAULT false NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`merged_into_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_unique` ON `users` (`phone_number`);
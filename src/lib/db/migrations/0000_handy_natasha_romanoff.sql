CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`value` integer NOT NULL,
	`suit` text NOT NULL,
	`weight` integer NOT NULL,
	`deck` text DEFAULT 'standard' NOT NULL,
	`modifier` text DEFAULT 'basic' NOT NULL,
	`exact_pull_chance` integer NOT NULL,
	`generic_pull_chance` integer NOT NULL,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `group_referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_group_id` text NOT NULL,
	`referee_group_id` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_at` text NOT NULL,
	`responded_at` text,
	`referrer_confirmed_at` text,
	`referee_confirmed_at` text,
	FOREIGN KEY (`referrer_group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referee_group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_referrals_pair_unique` ON `group_referrals` (`referrer_group_id`,`referee_group_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`city` text,
	`region` text,
	`country` text DEFAULT 'US',
	`display_location` text,
	`latitude` real,
	`longitude` real,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `otp_rate_limits` (
	`phone_e164` text(20) PRIMARY KEY NOT NULL,
	`last_request_at` text,
	`request_count_window` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `partner_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`phone_e164` text(20) NOT NULL,
	`first_name` text,
	`last_name` text,
	`invited_by_user_id` text NOT NULL,
	`invited_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_at` text NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text(65),
	`expires_at` text,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_card_id` text,
	`phone_e164` text(20) NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone_verified_at` text,
	`group_id` text NOT NULL,
	`created_by_user_id` text,
	`is_profile_complete` integer DEFAULT false,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_e164_unique` ON `users` (`phone_e164`);
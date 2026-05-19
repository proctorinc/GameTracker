PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_otp_rate_limits` (
	`phone_e164` text(20) PRIMARY KEY NOT NULL,
	`last_request_at` text,
	`request_count_window` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_otp_rate_limits`("phone_e164", "last_request_at", "request_count_window") SELECT "phone_e164", "last_request_at", "request_count_window" FROM `otp_rate_limits`;--> statement-breakpoint
DROP TABLE `otp_rate_limits`;--> statement-breakpoint
ALTER TABLE `__new_otp_rate_limits` RENAME TO `otp_rate_limits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text(65),
	`expires_at` text,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "user_id", "token_hash", "expires_at", "created_at") SELECT "id", "user_id", "token_hash", "expires_at", "created_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);
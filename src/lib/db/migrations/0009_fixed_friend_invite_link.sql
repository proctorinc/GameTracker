ALTER TABLE `users` ADD `friend_invite_token` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_friend_invite_token_unique` ON `users` (`friend_invite_token`);

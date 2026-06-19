DROP INDEX IF EXISTS `users_phone_number_unique`;
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone_number`;
--> statement-breakpoint
ALTER TABLE `invitations` RENAME TO `__old_invitations`;
--> statement-breakpoint
DROP INDEX IF EXISTS `invitations_invite_token_unique`;
--> statement-breakpoint
CREATE TABLE `invitations` (
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
    (`invitations`.`target_type` = 'user' AND `invitations`.`invitee_user_id` IS NOT NULL AND `invitations`.`invite_token` IS NULL) OR
    (`invitations`.`target_type` = 'link' AND `invitations`.`invite_token` IS NOT NULL)
  ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_invite_token_unique` ON `invitations` (`invite_token`);
--> statement-breakpoint
INSERT INTO `invitations` (
  `id`,
  `inviter_user_id`,
  `target_type`,
  `invitee_user_id`,
  `invite_token`,
  `guest_user_id`,
  `kind`,
  `status`,
  `accepted_by_user_id`,
  `accepted_at`,
  `expires_at`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `inviter_user_id`,
  `target_type`,
  `invitee_user_id`,
  `invite_token`,
  `guest_user_id`,
  `kind`,
  `status`,
  `accepted_by_user_id`,
  `accepted_at`,
  `expires_at`,
  `created_at`,
  `updated_at`
FROM `__old_invitations`
WHERE `target_type` IN ('user', 'link');
--> statement-breakpoint
DROP TABLE `__old_invitations`;

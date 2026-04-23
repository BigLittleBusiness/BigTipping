ALTER TABLE `competitions` ADD `inviteToken` varchar(64);--> statement-breakpoint
ALTER TABLE `competitions` ADD `inviteEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_inviteToken_unique` UNIQUE(`inviteToken`);--> statement-breakpoint
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_inviteToken_idx` UNIQUE(`inviteToken`);
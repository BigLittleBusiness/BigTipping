ALTER TABLE `email_events` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `email_events` ADD `referenceId` int;--> statement-breakpoint
CREATE INDEX `ee_userId_template_ref_idx` ON `email_events` (`userId`,`templateKey`,`referenceId`);
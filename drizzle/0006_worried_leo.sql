CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` varchar(100) NOT NULL,
	`referenceId` int NOT NULL,
	`tenantId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`payload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rounds` ADD `scoredAt` timestamp;--> statement-breakpoint
CREATE INDEX `sj_status_scheduledAt_idx` ON `scheduled_jobs` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `sj_tenantId_idx` ON `scheduled_jobs` (`tenantId`);
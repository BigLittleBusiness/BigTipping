CREATE TABLE `round_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`competitionId` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`recipientCount` int NOT NULL DEFAULT 0,
	`sentByUserId` int NOT NULL,
	CONSTRAINT `round_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rr_roundId_idx` ON `round_reminders` (`roundId`);
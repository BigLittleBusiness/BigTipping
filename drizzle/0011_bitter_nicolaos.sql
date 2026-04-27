CREATE TABLE `sport_api_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sportId` int NOT NULL,
	`providerName` varchar(255) NOT NULL,
	`baseUrl` varchar(500) NOT NULL,
	`apiKey` varchar(500),
	`endpointFixtures` varchar(500),
	`endpointResults` varchar(500),
	`additionalHeaders` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sport_api_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `competitions` ADD `jokerRoundEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `jokerRoundId` int;--> statement-breakpoint
ALTER TABLE `competitions` ADD `jokerMultiplier` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `fixtures` ADD `homeGoals` int;--> statement-breakpoint
ALTER TABLE `fixtures` ADD `homeBehinds` int;--> statement-breakpoint
ALTER TABLE `fixtures` ADD `awayGoals` int;--> statement-breakpoint
ALTER TABLE `fixtures` ADD `awayBehinds` int;--> statement-breakpoint
ALTER TABLE `tips` ADD `tieBreakerValue` int;--> statement-breakpoint
ALTER TABLE `tips` ADD `useJoker` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `sac_sportId_idx` ON `sport_api_configs` (`sportId`);
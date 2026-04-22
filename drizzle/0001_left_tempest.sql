CREATE TABLE `competition_entrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `competition_entrants_id` PRIMARY KEY(`id`),
	CONSTRAINT `ce_comp_user_unique` UNIQUE(`competitionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`sportId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`season` varchar(20),
	`status` enum('draft','active','round-by-round','completed') NOT NULL DEFAULT 'draft',
	`scoringRules` json,
	`startDate` timestamp,
	`endDate` timestamp,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`homeTeamId` int NOT NULL,
	`awayTeamId` int NOT NULL,
	`venue` varchar(255),
	`startTime` timestamp,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`homeScore` int,
	`awayScore` int,
	`winnerId` int,
	`margin` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixtures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`userId` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`rank` int NOT NULL DEFAULT 0,
	`previousRank` int NOT NULL DEFAULT 0,
	`correctTips` int NOT NULL DEFAULT 0,
	`totalTips` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`bestStreak` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `lb_comp_user_unique` UNIQUE(`competitionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('weekly','season','special') NOT NULL DEFAULT 'weekly',
	`roundId` int,
	`awardedToUserId` int,
	`isAwarded` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`roundNumber` int NOT NULL,
	`name` varchar(100),
	`status` enum('upcoming','open','closed','scored') NOT NULL DEFAULT 'upcoming',
	`tipsOpenAt` timestamp,
	`tipsCloseAt` timestamp,
	`scoringCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rounds_id` PRIMARY KEY(`id`),
	CONSTRAINT `rounds_comp_round_unique` UNIQUE(`competitionId`,`roundNumber`)
);
--> statement-breakpoint
CREATE TABLE `sports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` enum('AFL','NRL','Super Netball') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sports_id` PRIMARY KEY(`id`),
	CONSTRAINT `sports_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sportId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`abbreviation` varchar(10),
	`logoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`logoUrl` text,
	`status` enum('active','suspended','trial') NOT NULL DEFAULT 'trial',
	`contactEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fixtureId` int NOT NULL,
	`competitionId` int NOT NULL,
	`pickedTeamId` int NOT NULL,
	`isCorrect` boolean,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tips_id` PRIMARY KEY(`id`),
	CONSTRAINT `tips_user_fixture_unique` UNIQUE(`userId`,`fixtureId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('system_admin','tenant_admin','entrant') NOT NULL DEFAULT 'entrant';--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
CREATE INDEX `ce_competitionId_idx` ON `competition_entrants` (`competitionId`);--> statement-breakpoint
CREATE INDEX `competitions_tenantId_idx` ON `competitions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `competitions_sportId_idx` ON `competitions` (`sportId`);--> statement-breakpoint
CREATE INDEX `fixtures_roundId_idx` ON `fixtures` (`roundId`);--> statement-breakpoint
CREATE INDEX `lb_competitionId_idx` ON `leaderboard_entries` (`competitionId`);--> statement-breakpoint
CREATE INDEX `prizes_competitionId_idx` ON `prizes` (`competitionId`);--> statement-breakpoint
CREATE INDEX `rounds_competitionId_idx` ON `rounds` (`competitionId`);--> statement-breakpoint
CREATE INDEX `teams_sportId_idx` ON `teams` (`sportId`);--> statement-breakpoint
CREATE INDEX `tips_userId_idx` ON `tips` (`userId`);--> statement-breakpoint
CREATE INDEX `tips_fixtureId_idx` ON `tips` (`fixtureId`);
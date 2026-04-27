CREATE TABLE `billing_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`date` timestamp NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'AUD',
	`status` enum('paid','pending','failed','refunded') NOT NULL DEFAULT 'pending',
	`description` varchar(255),
	`invoiceUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billing_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competition_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`fontColour` varchar(20) NOT NULL DEFAULT '#1a1a1a',
	`fontType` varchar(100) NOT NULL DEFAULT 'Inter',
	`bgColour` varchar(20) NOT NULL DEFAULT '#ffffff',
	`bgImageUrl` text,
	`bgImageMode` enum('centred','full_width','tile') DEFAULT 'full_width',
	`landingPageText` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competition_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_branding_competitionId_unique` UNIQUE(`competitionId`)
);
--> statement-breakpoint
CREATE TABLE `prize_places` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prizeId` int NOT NULL,
	`place` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`value` varchar(100),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prize_places_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prize_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`weeklyWinCondition` enum('all_correct','highest_score','highest_score_margin') NOT NULL DEFAULT 'highest_score',
	`seasonWinCondition` enum('highest_score','highest_score_margin','highest_score_head_to_head') NOT NULL DEFAULT 'highest_score',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prize_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `prize_rules_competitionId_unique` UNIQUE(`competitionId`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`level` varchar(50) NOT NULL DEFAULT 'Basic',
	`paymentTerm` enum('monthly','annually') NOT NULL DEFAULT 'monthly',
	`paymentMethod` enum('credit_card','invoice') NOT NULL DEFAULT 'invoice',
	`cardLast4` varchar(4),
	`cardBrand` varchar(20),
	`invoiceRecipientName` varchar(255),
	`invoiceRecipientEmail` varchar(320),
	`invoicePONumber` varchar(100),
	`orgName` varchar(255),
	`orgABN` varchar(20),
	`orgAddress` text,
	`orgPhone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
ALTER TABLE `rounds` ADD `tieBreakerFixtureId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `mobile` varchar(20);--> statement-breakpoint
CREATE INDEX `bh_tenantId_idx` ON `billing_history` (`tenantId`);--> statement-breakpoint
CREATE INDEX `pp_prizeId_idx` ON `prize_places` (`prizeId`);
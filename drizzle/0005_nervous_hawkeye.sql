CREATE TABLE `email_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`tenantId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`eventType` enum('sent','delivered','bounce','complaint','open','click') NOT NULL,
	`bounceType` varchar(50),
	`diagnosticCode` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`recipientRole` enum('admin','entrant') NOT NULL,
	`name` varchar(200) NOT NULL,
	`triggerDesc` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`subject` varchar(500) NOT NULL,
	`bodyHtml` text NOT NULL,
	`bodyText` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `et_tenant_key_idx` UNIQUE(`tenantId`,`templateKey`)
);
--> statement-breakpoint
CREATE TABLE `tenant_email_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`logoUrl` text,
	`logoPosition` enum('top','bottom') NOT NULL DEFAULT 'top',
	`primaryColor` varchar(7) NOT NULL DEFAULT '#2B4EAE',
	`footerText` text,
	`businessAddress` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_email_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_email_settings_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `user_email_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invalidEmail` boolean NOT NULL DEFAULT false,
	`marketingDisabled` boolean NOT NULL DEFAULT false,
	`lastEngagementAt` timestamp,
	`sunsetWarningSentAt` timestamp,
	`softBounceCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_email_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `ee_tenantId_idx` ON `email_events` (`tenantId`);--> statement-breakpoint
CREATE INDEX `ee_recipient_idx` ON `email_events` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `ee_messageId_idx` ON `email_events` (`messageId`);--> statement-breakpoint
CREATE INDEX `et_tenantId_idx` ON `email_templates` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tes_tenantId_idx` ON `tenant_email_settings` (`tenantId`);--> statement-breakpoint
CREATE INDEX `uep_userId_idx` ON `user_email_preferences` (`userId`);
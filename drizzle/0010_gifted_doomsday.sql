ALTER TABLE `tips` MODIFY COLUMN `pickedTeamId` int;--> statement-breakpoint
ALTER TABLE `competitions` ADD `allowDraw` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tips` ADD `isDraw` boolean DEFAULT false NOT NULL;
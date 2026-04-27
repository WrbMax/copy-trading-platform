CREATE TABLE `subscription_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` varchar(32) NOT NULL,
	`tier` enum('basic','advanced') NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`chain` enum('BSC','TRC20') NOT NULL,
	`payAddress` varchar(128) NOT NULL,
	`derivationIndex` int NOT NULL,
	`status` enum('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
	`txHash` varchar(128),
	`paidAmount` decimal(20,8),
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`subscriptionId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('trial','basic_1m','basic_6m','basic_1y','advanced_1m','advanced_6m','advanced_1y','invite_bonus','admin_grant') NOT NULL,
	`daysAdded` int NOT NULL,
	`amountPaid` decimal(20,8) NOT NULL DEFAULT '0',
	`txHash` varchar(128),
	`payAddress` varchar(128),
	`relatedUserId` int,
	`expiryBefore` timestamp,
	`expiryAfter` timestamp NOT NULL,
	`tier` enum('basic','advanced') NOT NULL DEFAULT 'basic',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fund_transactions` MODIFY COLUMN `type` enum('deposit','withdrawal','revenue_share_in','revenue_share_out','admin_adjust','subscription') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastPointsRedeemMonth` varchar(30);--> statement-breakpoint
ALTER TABLE `signal_sources` ADD `tier` varchar(16) DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `basicExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `advancedExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `activeTier` enum('basic','advanced') DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE `users` ADD `trialUsed` boolean DEFAULT false NOT NULL;
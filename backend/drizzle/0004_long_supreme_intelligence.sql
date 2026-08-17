ALTER TABLE `users` ADD `aimag` text;--> statement-breakpoint
ALTER TABLE `users` ADD `sum` text;--> statement-breakpoint
ALTER TABLE `users` ADD `dealer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
CREATE INDEX `users_dealer_id_idx` ON `users` (`dealer_id`);
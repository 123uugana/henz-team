CREATE TABLE `dealer_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`requested_by_user_id` text NOT NULL,
	`org_name` text NOT NULL,
	`contact` text NOT NULL,
	`prefix_requested` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`decided_at` text,
	FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dealer_registrations_status_idx` ON `dealer_registrations` (`status`);--> statement-breakpoint
CREATE TABLE `rfid_tag_registry` (
	`epc` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`claimed_by_user_id` text,
	`claimed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`claimed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `rfid_tag_registry_status_idx` ON `rfid_tag_registry` (`status`);--> statement-breakpoint
CREATE INDEX `rfid_tag_registry_claimed_by_idx` ON `rfid_tag_registry` (`claimed_by_user_id`);--> statement-breakpoint
ALTER TABLE `livestock` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `livestock` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `livestock` ADD `location_updated_at` text;
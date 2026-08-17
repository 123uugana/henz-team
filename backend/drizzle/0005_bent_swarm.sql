CREATE TABLE `rfid_unknown_epcs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`epc` text NOT NULL,
	`reader_id` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`seen_count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reader_id`) REFERENCES `rfid_readers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rfid_unknown_epcs_user_epc_idx` ON `rfid_unknown_epcs` (`user_id`,`epc`);--> statement-breakpoint
CREATE INDEX `rfid_unknown_epcs_last_seen_idx` ON `rfid_unknown_epcs` (`last_seen_at`);--> statement-breakpoint
ALTER TABLE `rfid_readers` ADD `location` text;--> statement-breakpoint
ALTER TABLE `rfid_readers` ADD `device_secret_hash` text;--> statement-breakpoint
ALTER TABLE `rfid_scans` ADD `source` text DEFAULT 'APP' NOT NULL;--> statement-breakpoint
ALTER TABLE `rfid_scans` ADD `duplicate_of_scan_id` text;--> statement-breakpoint
CREATE INDEX `rfid_scans_user_reader_epc_idx` ON `rfid_scans` (`user_id`,`reader_id`,`epc`);
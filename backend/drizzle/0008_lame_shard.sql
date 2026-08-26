ALTER TABLE `rfid_scans` ADD `rssi` integer;--> statement-breakpoint
ALTER TABLE `rfid_scans` ADD `antenna_id` text;--> statement-breakpoint
ALTER TABLE `rfid_scans` ADD `scan_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rfid_scans` ADD `raw_payload` text;
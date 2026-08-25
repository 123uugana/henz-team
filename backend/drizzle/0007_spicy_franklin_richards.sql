CREATE TABLE `livestock_removals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`livestock_id` text NOT NULL,
	`livestock_created_at` text NOT NULL,
	`removed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `livestock_removals_user_id_idx` ON `livestock_removals` (`user_id`);--> statement-breakpoint
CREATE INDEX `livestock_removals_removed_at_idx` ON `livestock_removals` (`removed_at`);
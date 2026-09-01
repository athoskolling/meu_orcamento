CREATE TABLE `savings_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`initial_saved_cents` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#3D78A3' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `savings_goals_name_unique` ON `savings_goals` (`name`);--> statement-breakpoint
CREATE TABLE `goal_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`month` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`contributed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `savings_goals`(`id`) ON UPDATE no action ON DELETE cascade
);

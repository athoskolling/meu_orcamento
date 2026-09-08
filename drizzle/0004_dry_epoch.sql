CREATE TABLE `installment_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`total_installments` integer NOT NULL,
	`initial_paid` integer DEFAULT 0 NOT NULL,
	`first_pending_month` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `purchases` ADD `installment_plan_id` integer REFERENCES installment_plans(id);--> statement-breakpoint
ALTER TABLE `purchases` ADD `installment_number` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_installment_unique` ON `purchases` (`installment_plan_id`,`installment_number`);
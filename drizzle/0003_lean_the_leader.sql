ALTER TABLE `monthly_plans` ADD `food_allowance_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` ADD `payment_source` text DEFAULT 'cash' NOT NULL;
CREATE TYPE "public"."device_status" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('assigned', 'accepted', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."scrap_status" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TABLE "carbon" (
	"id" varchar PRIMARY KEY NOT NULL,
	"Fuel_name" text,
	"consumption" integer,
	"unit" text,
	"CO2" double precision,
	"CH4" double precision,
	"N2O" double precision,
	"PFCs" double precision,
	"HFCs" double precision,
	"SF6" double precision,
	"NF3" double precision,
	"CO2gwp" integer,
	"CH4gwp" integer,
	"N2Ogwp" integer,
	"PFCsgwp" integer,
	"HFCsgwp" integer,
	"SF6gwp" integer,
	"NF3gwp" integer
);
--> statement-breakpoint
CREATE TABLE "carbon_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"carbon_id" varchar NOT NULL,
	"fuel_name" text NOT NULL,
	"consumption" double precision NOT NULL,
	"unit" text NOT NULL,
	"total_emission" double precision NOT NULL,
	"calculation_date" date NOT NULL,
	"created_at" timestamp NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" integer PRIMARY KEY NOT NULL,
	"status" "device_status" NOT NULL,
	"name" text NOT NULL,
	"boot_time" timestamp NOT NULL,
	"ratio" double precision,
	"issue_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "energy_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer,
	"type" text,
	"date" date,
	"consumption" double precision
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"description" text,
	"issuer" integer NOT NULL,
	"assigner" integer,
	"status" "issue_status" NOT NULL,
	"create_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"description" text NOT NULL,
	"create_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" integer,
	"title" text NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" "schedule_status" DEFAULT 'assigned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" "scrap_status" NOT NULL,
	"humidity" integer NOT NULL,
	"weight" integer NOT NULL,
	"volume" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" NOT NULL,
	"mail" text,
	"status" text,
	"create_time" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carbon_calculations" ADD CONSTRAINT "carbon_calculations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carbon_calculations" ADD CONSTRAINT "carbon_calculations_carbon_id_carbon_id_fk" FOREIGN KEY ("carbon_id") REFERENCES "public"."carbon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_record" ADD CONSTRAINT "energy_record_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_issuer_users_id_fk" FOREIGN KEY ("issuer") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigner_users_id_fk" FOREIGN KEY ("assigner") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;
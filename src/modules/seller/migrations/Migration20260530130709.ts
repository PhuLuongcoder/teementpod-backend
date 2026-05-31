import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530130709 extends Migration {

  override async up(): Promise<void> {
    // 1. Tạo các bảng mới (Dành cho Dịch vụ và Lịch sử thanh toán vừa làm ở các bước trước)
    this.addSql(`create table if not exists "payment_history" ("id" text not null, "shop_id" text not null, "billing_cycle" text not null, "amount" real not null, "total_successful_orders" integer not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_history_deleted_at" ON "payment_history" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service" ("id" text not null, "title" text not null, "description" text not null, "icon" text not null, "tags" jsonb null, "popular" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_deleted_at" ON "service" ("deleted_at") WHERE deleted_at IS NULL;`);

    // 2. ÉP THÊM CỘT VÀO BẢNG SELLER_ORDER ĐÃ TỒN TẠI (Logic Reship)
    this.addSql(`alter table if exists "seller_order" add column if not exists "display_id" text null;`);
    this.addSql(`alter table if exists "seller_order" add column if not exists "order_type" text check ("order_type" in ('standard', 'reshipment')) not null default 'standard';`);
    this.addSql(`alter table if exists "seller_order" add column if not exists "parent_order_id" text null;`);
    this.addSql(`alter table if exists "seller_order" add column if not exists "support_reason" text null;`);
  }

  override async down(): Promise<void> {
    // Revert lại nếu có lỗi
    this.addSql(`alter table if exists "seller_order" drop column if exists "display_id";`);
    this.addSql(`alter table if exists "seller_order" drop column if exists "order_type";`);
    this.addSql(`alter table if exists "seller_order" drop column if exists "parent_order_id";`);
    this.addSql(`alter table if exists "seller_order" drop column if exists "support_reason";`);
    
    this.addSql(`drop table if exists "service" cascade;`);
    this.addSql(`drop table if exists "payment_history" cascade;`);
  }

}
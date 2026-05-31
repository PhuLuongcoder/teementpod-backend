import { model } from "@medusajs/framework/utils"
import { Shop } from "./shop"

export const SellerOrder = model.define("seller_order", {
  id: model.id().primaryKey(),
  external_order_id: model.text().unique(), 
  order_price: model.float().default(0),
  shipping_cost: model.float().default(0),
  display_id: model.text().nullable(),
  customer_name: model.text(),
  customer_email: model.text().nullable(),
  customer_phone: model.text().nullable(),
  shipping_address: model.json(), 
  
  product_type: model.text(),
  items: model.json().nullable(),
  design_front_url: model.text().nullable(),
  design_back_url: model.text().nullable(),
  special_print_areas: model.json().nullable(), 
  status: model.enum(["pending", "complete", "processing", "in_transit", "done", "cancelled", "support"]).default("pending"),
  tracking_number: model.text().nullable(),
  shipping_carrier: model.text().nullable(), 
  tracking_url: model.text().nullable(),     
  shipped_date: model.dateTime().nullable(),
  order_note: model.text().nullable(),
  order_date: model.dateTime(),

  // --- CÁC TRƯỜNG THÊM MỚI CHO LOGIC RESHIP (HỖ TRỢ ĐI LẠI ĐƠN) ---
  order_type: model.enum(["standard", "reshipment"]).default("standard"),
  parent_order_id: model.text().nullable(), // ID gốc của đơn nếu đây là đơn đi lại
  support_reason: model.text().nullable(),  // Lý do xưởng duyệt đi lại đơn

  shop: model.belongsTo(() => Shop, {
    mappedBy: "orders",
  }),
})
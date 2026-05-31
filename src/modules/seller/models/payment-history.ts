import { model } from "@medusajs/framework/utils"

export const PaymentHistory = model.define("payment_history", {
  id: model.id().primaryKey(),
  shop_id: model.text(),
  billing_cycle: model.text(),              
  amount: model.float(),                   
  total_successful_orders: model.number(),   
  note: model.text().nullable(),          
})
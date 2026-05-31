import { model } from "@medusajs/framework/utils"
import { Shop } from "./shop"

export const Seller = model.define("seller", {
  name: model.text().nullable(),
  id: model.id().primaryKey(), 
  first_name: model.text().nullable(),          
  last_name: model.text().nullable(), 
  username: model.text().unique(),
  password_hash: model.text(), 
  phone: model.text().nullable(),
  is_active: model.boolean().default(true),
  markup_fee: model.float().default(0),
  shops: model.hasMany(() => Shop), 
})
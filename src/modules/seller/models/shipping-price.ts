import { model } from "@medusajs/framework/utils"

export const ShippingPrice = model.define("shipping_price", {
  id: model.id().primaryKey(),      
  country_code: model.text(),          
  first_item_cost: model.float(),     
  additional_item_cost: model.float(), 
})
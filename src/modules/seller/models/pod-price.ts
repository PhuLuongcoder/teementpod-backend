import { model } from "@medusajs/framework/utils"

export const PodPrice = model.define("pod_price", {
  id: model.id().primaryKey(),
  product_type: model.text(),   
  size: model.text(),           
  base_cost: model.float(),     
  extra_print_cost: model.float().default(0), 
})
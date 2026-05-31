import { model } from "@medusajs/framework/utils"

export const PodBlank = model.define("pod_blank", {
  id: model.id().primaryKey(),
  sku: model.text().unique(),
  name: model.text(),
  image_url: model.text().nullable(),
  material: model.text().nullable(),
  in_stock: model.boolean().default(true),
  display_price: model.float().default(0), 
  description: model.text().nullable(),
  colors: model.json().nullable(),
  category: model.text().default("T-Shirt"),
  sizes: model.json().nullable(),  
  out_of_stock_variants: model.json().nullable(), 
})
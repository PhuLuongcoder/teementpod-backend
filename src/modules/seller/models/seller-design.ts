import { model } from "@medusajs/framework/utils"
import { Shop } from "./shop"

export const SellerDesign = model.define("seller_design", {
  id: model.id().primaryKey(),
  sku: model.text(),
  design_front_url: model.text().nullable(),
  design_back_url: model.text().nullable(),
  mockup_url: model.text().nullable(),
  
  // Ràng buộc thiết kế này thuộc về Shop nào
  shop: model.belongsTo(() => Shop, {
    mappedBy: "designs",
  }),
})
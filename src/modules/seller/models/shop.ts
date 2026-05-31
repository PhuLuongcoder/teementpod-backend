import { model } from "@medusajs/framework/utils"
import { SellerDesign } from "./seller-design"
import { Seller } from "./seller"
import { SellerOrder } from "./seller-order"

export const Shop = model.define("shop", {
  id: model.id().primaryKey(),
  name: model.text(),                          
  platform: model.text().default("custom"),    
  balance: model.bigNumber().default(0),  
       
  seller: model.belongsTo(() => Seller, {
    mappedBy: "shops",
  }),
  orders: model.hasMany(() => SellerOrder),
  designs: model.hasMany(() => SellerDesign),
  is_active: model.boolean().default(true),
  logo_url: model.text().nullable(),
  tax_id: model.text().nullable(),
})
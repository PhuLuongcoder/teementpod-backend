import { model } from "@medusajs/framework/utils"

export const Service = model.define("service", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text(),
  icon: model.text(), 
  tags: model.json().nullable(), 
  popular: model.boolean().default(false), 
})
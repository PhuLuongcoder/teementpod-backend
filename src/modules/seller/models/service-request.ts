import { model } from "@medusajs/framework/utils"

export const ServiceRequest = model.define("service_request", {
  id: model.id().primaryKey(),
  seller_id: model.text(),
  service_id: model.text(),
  type: model.text(), // Các loại: 'remake', 'custom', 'enhance'
  quantity: model.number().default(1),
  price: model.bigNumber(), // Tổng tiền dịch vụ (Tạo công nợ)
  instructions: model.text().nullable(),
  original_image_url: model.text(), // Link ảnh Seller dán vào
  result_image_url: model.text().nullable(), // Link kết quả Admin trả về
  status: model.text().default("in_process"), // in_process, waiting_approval, completed
  revision_note: model.text().nullable(), // Ghi chú khi seller bấm "Điều chỉnh"
  payment_status: model.text().default("unpaid"), // unpaid, paid (Dùng để tính tổng nợ dịch vụ)
})

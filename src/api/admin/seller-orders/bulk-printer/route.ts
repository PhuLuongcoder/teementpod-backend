import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { order_ids, printer_name } = req.body as { order_ids: string[]; printer_name: string };
    
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Chưa chọn đơn hàng nào!" });
    }

    // Gọi service quản lý đơn hàng Seller của bác (Tên service tùy thuộc vào code của bác)
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    // Lặp qua các ID để update metadata
    for (const id of order_ids) {
      // 1. Lấy thông tin đơn hàng hiện tại
      const order = await sellerService.retrieveSellerOrder(id); // (Lưu ý sửa tên hàm retrieve cho đúng code bác)
      
      // 2. Gom metadata cũ và đè printer_name mới vào
      const currentMetadata = order.metadata || {};
      const newMetadata = { ...currentMetadata, printer_name: printer_name };

      // 3. Lưu lại
      await sellerService.updateSellerOrder(id, { metadata: newMetadata }); // (Lưu ý sửa tên hàm update cho đúng code bác)
    }

    return res.json({ success: true, message: "Cập nhật Nhà In thành công!" });

  } catch (error: any) {
    console.error("❌ LỖI UPDATE NHÀ IN METADATA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

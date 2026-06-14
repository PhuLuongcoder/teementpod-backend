import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { order_ids, printer_name } = req.body as { order_ids: string[]; printer_name: string };
    
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Chưa chọn đơn hàng nào!" });
    }

    // Gọi service quản lý
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    // 1. Quét qua tất cả ID để lấy Metadata hiện tại (tránh ghi đè mất dữ liệu cũ)
    const updateData: any[] = [];
    for (const id of order_ids) {
      const order = await sellerService.retrieveSellerOrder(id);
      
      updateData.push({
        id: id,
        metadata: {
          ...(order.metadata || {}), // Giữ nguyên các metadata khác nếu có
          printer_name: printer_name // Chèn/Sửa tên nhà in vào
        }
      });
    }

    // 2. Dùng hàm chuẩn Medusa v2 để Update hàng loạt chỉ trong 1 lệnh DB
    await sellerService.updateSellerOrders(updateData);

    return res.json({ success: true, message: "Cập nhật Nhà In thành công!" });

  } catch (error: any) {
    console.error("❌ LỖI UPDATE NHÀ IN METADATA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// 1. Định nghĩa khuôn mẫu (Type) cho dữ liệu gửi lên
type BulkStatusPayload = {
  order_ids?: string[];
  filter_status?: string;
  is_select_all?: boolean;
  new_status: "pending" | "complete" | "processing" | "in_transit" | "done" | "cancelled" | "support";
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerService = req.scope.resolve("sellerModuleService") as any;
  
  // 2. Ép kiểu req.body sang khuôn mẫu đã định nghĩa (Sẽ hết báo lỗi đỏ)
  const { order_ids, filter_status, is_select_all, new_status } = req.body as BulkStatusPayload;

  try {
    let idsToUpdate: string[] = [];

    // TRƯỜNG HỢP 1: Chọn tất cả xuyên phân trang (Dựa vào filter)
    if (is_select_all && filter_status) {
      const allMatchingOrders = await sellerService.listSellerOrders(
        { status: filter_status }, 
        { take: 999999 } // Lấy số lượng cực lớn để bao trọn tất cả
      );
      idsToUpdate = allMatchingOrders.map((o: any) => o.id);
    } 
    // TRƯỜNG HỢP 2: Chỉ chọn một số đơn cụ thể trên trang hiện tại
    else if (order_ids && order_ids.length > 0) {
      idsToUpdate = order_ids;
    }

    if (idsToUpdate.length === 0) {
      return res.status(400).json({ message: "Không có đơn hàng nào được chọn." });
    }

    // Thực hiện Update hàng loạt
    for (const id of idsToUpdate) {
      await sellerService.updateSellerOrders({
        id,
        status: new_status
      });
    }

    res.json({ 
      success: true, 
      updated_count: idsToUpdate.length,
      message: `Đã chuyển ${idsToUpdate.length} đơn hàng sang trạng thái ${new_status}` 
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    
    // 1. Nhận các thông số từ Frontend gửi xuống
    const { markup_fee, per_order_fee, special_discount, discount_note } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 2. Tạo một Object Payload linh hoạt
    const updatePayload: any = { id };
    
    if (markup_fee !== undefined) {
      // Dùng parseFloat để giữ nguyên phần thập phân
      updatePayload.markup_fee = parseFloat(markup_fee);
    }
    
    if (per_order_fee !== undefined) {
      // Dùng parseFloat để giữ nguyên phần thập phân
      updatePayload.per_order_fee = parseFloat(per_order_fee);
    }

    // --- CẬP NHẬT TRƯỜNG ƯU ĐÃI ---
    if (special_discount !== undefined) {
      updatePayload.special_discount = String(special_discount);
    }

    if (discount_note !== undefined) {
      updatePayload.discount_note = String(discount_note);
    }
    // ------------------------------

    // 3. Tiến hành cập nhật vào Database
    const updatedSeller = await sellerService.updateSellers(updatePayload);
    
    res.json({ status: "success", seller: updatedSeller });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

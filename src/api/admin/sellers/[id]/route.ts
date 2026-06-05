import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    
    // 1. Nhận các thông số từ Frontend gửi xuống (Đã thêm 2 trường Ưu đãi)
    const { markup_fee, per_order_fee, special_discount, discount_note } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 2. Tạo một Object Payload linh hoạt
    // Chỉ cập nhật những trường nào được Admin gửi lên, giữ nguyên các trường khác
    const updatePayload: any = { id };
    
    if (markup_fee !== undefined) {
      updatePayload.markup_fee = Number(markup_fee);
    }
    
    if (per_order_fee !== undefined) {
      updatePayload.per_order_fee = Number(per_order_fee);
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

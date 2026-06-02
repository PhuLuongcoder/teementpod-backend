import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    // 1. Nhận cả 2 loại phí từ Frontend gửi xuống
    const { markup_fee, per_order_fee } = req.body as any;
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

    // 3. Tiến hành cập nhật vào Database
    const updatedSeller = await sellerService.updateSellers(updatePayload);
    
    res.json({ status: "success", seller: updatedSeller });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

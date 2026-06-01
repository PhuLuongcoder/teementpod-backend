// teementpod/src/api/admin/seller-orders/[id]/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // Lấy chi tiết đơn hàng kèm theo quan hệ shop
    const order = await sellerService.retrieveSellerOrder(id, {
      relations: ["shop"]
    });

    res.json({ order });
  } catch (error: any) {
    res.status(404).json({ message: "Không tìm thấy đơn hàng", error: error.message });
  }
}

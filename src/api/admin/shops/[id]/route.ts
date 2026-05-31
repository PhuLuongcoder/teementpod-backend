import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Admin Khóa / Mở khóa Shop
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { is_active } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const updatedShop = await sellerService.updateShops({ id, is_active });
    res.json({ status: "success", shop: updatedShop });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Admin Xóa vĩnh viễn Shop
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    await sellerService.deleteShops([id]);
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    await sellerService.deletePodPrices([id]);

    res.json({ status: "success", message: "Đã xóa cấu hình giá." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
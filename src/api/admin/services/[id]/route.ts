import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    await sellerService.deleteServices([id]);
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
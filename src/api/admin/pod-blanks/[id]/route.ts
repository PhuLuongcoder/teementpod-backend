import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    await sellerService.deletePodBlanks([req.params.id]);
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const services = await sellerService.listServices({}, { order: { created_at: "ASC" } });
    res.json({ status: "success", services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
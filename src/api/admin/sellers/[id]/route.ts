import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { markup_fee } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const updatedSeller = await sellerService.updateSellers({ 
      id, 
      markup_fee: Number(markup_fee) 
    });
    res.json({ status: "success", seller: updatedSeller });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
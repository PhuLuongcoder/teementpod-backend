import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const prices = await sellerService.listPodPrices({}, { order: { product_type: "ASC", size: "ASC" } });
    res.json({ status: "success", prices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { id, product_type, size, base_cost, extra_print_cost } = req.body as any;

    if (!product_type || !size) {
      return res.status(400).json({ error: "Thiếu Loại sản phẩm hoặc Size" });
    }

    let price;
    if (id) {
      price = await sellerService.updatePodPrices({
        id, product_type, size, base_cost: Number(base_cost), extra_print_cost: Number(extra_print_cost)
      });
    } else {
      price = await sellerService.createPodPrices({
        product_type, size, base_cost: Number(base_cost), extra_print_cost: Number(extra_print_cost)
      });
    }
    res.json({ status: "success", price });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
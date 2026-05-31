import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const prices = await sellerService.listShippingPrices({}, { order: { country_code: "ASC" } });
    res.json({ status: "success", prices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { id, country_code, first_item_cost, additional_item_cost } = req.body as any;

    if (!country_code) {
      return res.status(400).json({ error: "Thiếu Mã quốc gia" });
    }

    const cleanCountry = country_code.trim().toUpperCase();
    let price;

    if (id) {
      price = await sellerService.updateShippingPrices({
        id,
        country_code: cleanCountry, 
        first_item_cost: Number(first_item_cost), 
        additional_item_cost: Number(additional_item_cost)
      });
    } else {
      // Đảm bảo mỗi quốc gia chỉ tồn tại duy nhất một cấu hình giá ship chung (Upsert)
      const existing = await sellerService.listShippingPrices({ country_code: cleanCountry }) as any[];
      if (existing.length > 0) {
        price = await sellerService.updateShippingPrices({
          id: existing[0].id,
          first_item_cost: Number(first_item_cost),
          additional_item_cost: Number(additional_item_cost)
        });
      } else {
        price = await sellerService.createShippingPrices({
          country_code: cleanCountry, 
          first_item_cost: Number(first_item_cost), 
          additional_item_cost: Number(additional_item_cost)
        });
      }
    }
    res.json({ status: "success", price });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
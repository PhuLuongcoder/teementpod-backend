import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { shop_id } = req.query as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    const blanks = await sellerService.listPodBlanks({ id });
    if (!blanks || blanks.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy phôi này" });
    }
    const blank = blanks[0];

    // Lấy phí Markup của Seller
    let markupFee = 0;
    if (shop_id) {
      const shops = await sellerService.listShops({ id: shop_id }, { relations: ["seller"] });
      if (shops.length > 0 && shops[0].seller) {
        markupFee = shops[0].seller.markup_fee || 0;
      }
    }

    // Truy vấn phí ship USPS (mặc định lấy cấu hình của US)
    const shipConfigs = await sellerService.listShippingPrices({ country_code: "US" });
    const uspsShippingFee = shipConfigs.length > 0 ? shipConfigs[0].first_item_cost : 0;

    // Lấy bảng giá theo Size
    const priceConfigs = await sellerService.listPodPrices({
      product_type: blank.name
    }) as any[];

    // Map lại bảng giá: Gộp phí ship vào Base Price và tách riêng Extra Print
    const sizePricesMap: Record<string, { base_price: number, extra_print: number }> = {};
    if (priceConfigs && priceConfigs.length > 0) {
      priceConfigs.forEach((cfg: any) => {
        sizePricesMap[cfg.size] = {
          base_price: cfg.base_cost + markupFee + uspsShippingFee,
          extra_print: cfg.extra_print_cost
        };
      });
    }

    res.json({ 
      status: "success", 
      blank: {
        ...blank,
        display_price: blank.display_price + markupFee + uspsShippingFee, // Giá khởi điểm
        size_prices: sizePricesMap,
        colors: blank.colors || [], 
        sizes: blank.sizes || [],   
        out_of_stock_variants: blank.out_of_stock_variants || [], 
        description: blank.description
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
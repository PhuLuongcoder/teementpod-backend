import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id } = req.query as any;

    let markupFee = 0;

    // Truy ngược từ Shop ra Seller để lấy markup_fee
    if (shop_id) {
      const shops = await sellerService.listShops({ id: shop_id }, { relations: ["seller"] });
      if (shops.length > 0 && shops[0].seller) {
        markupFee = shops[0].seller.markup_fee || 0;
      }
    }

    const catalog = await sellerService.listPodBlanks({}, { order: { created_at: "DESC" } });

    // Tính lại giá Base Cost = Giá gốc + Phí cộng thêm
    const adjustedCatalog = catalog.map((blank: any) => ({
      ...blank,
      display_price: blank.display_price + markupFee
    }));

    res.json({ status: "success", catalog: adjustedCatalog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
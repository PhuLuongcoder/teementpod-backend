import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const safeParseJSON = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } 
  catch (e) { return String(val).split(',').map(s => s.trim()).filter(Boolean); }
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const blanks = await sellerService.listPodBlanks({}, { order: { created_at: "DESC" } });
    res.json({ status: "success", blanks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { 
      id, sku, name, image_url, material, in_stock, display_price, description,
      colors, sizes, out_of_stock_variants, category
    } = req.body as any;

    if (!sku || !name) return res.status(400).json({ error: "Thiếu thông tin SKU hoặc Tên phôi" });

    let safePrice = Number(display_price);
    if (isNaN(safePrice)) { safePrice = 0; }

    const payload = {
      sku: String(sku).trim(),
      name: String(name).trim(),
      image_url: image_url ? String(image_url).trim() : null,
      material: material ? String(material).trim() : null,
      in_stock: Boolean(in_stock),
      display_price: safePrice,
      category: category ? String(category).trim() : "Khác",
      description: description ? String(description).trim() : null,
      colors: safeParseJSON(colors),
      sizes: safeParseJSON(sizes),
      out_of_stock_variants: safeParseJSON(out_of_stock_variants)
    };

    let blank;
    if (id) {
      blank = await sellerService.updatePodBlanks({ id, ...payload });
    } else {
      blank = await sellerService.createPodBlanks(payload);
    }
    res.json({ status: "success", blank });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

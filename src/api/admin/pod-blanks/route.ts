import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

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

    if (!sku || !name) {
      return res.status(400).json({ error: "Thiếu thông tin SKU hoặc Tên phôi sản phẩm" });
    }

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      image_url: image_url || null,
      material: material || null,
      in_stock: Boolean(in_stock),
      display_price: Number(display_price || 0),
      category: category ? category.trim() : "Khác",
      description: description || null,
      // Đảm bảo dữ liệu JSON được chuẩn hóa trước khi ghi vào Database
      colors: colors ? (Array.isArray(colors) ? colors : JSON.parse(colors)) : [],
      sizes: sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : [],
      out_of_stock_variants: out_of_stock_variants ? (Array.isArray(out_of_stock_variants) ? out_of_stock_variants : JSON.parse(out_of_stock_variants)) : []
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
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// 1. API XUẤT FILE CSV (EXPORT)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id } = req.query as any;

    if (!shop_id) {
      return res.status(400).json({ error: "Thiếu thông tin shop_id" });
    }

    // Lấy toàn bộ thiết kế của shop
    const designs = await sellerService.listSellerDesigns(
      { shop_id }, 
      { order: { created_at: "DESC" } }
    );

    // Định nghĩa header cho file CSV
    const headers = ["sku", "design_front_url", "design_back_url", "mockup_url"];
    let csvContent = headers.join(",") + "\n";

    const escapeCSV = (str: any) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    // Chuyển đổi data thành các dòng CSV
    designs.forEach((d: any) => {
      const row = [
        escapeCSV(d.sku),
        escapeCSV(d.design_front_url),
        escapeCSV(d.design_back_url),
        escapeCSV(d.mockup_url)
      ];
      csvContent += row.join(",") + "\n";
    });

    // Trả về chuỗi CSV được bọc trong JSON (Để qua mặt JWT Auth an toàn)
    res.json({ 
      status: "success", 
      csvData: "\uFEFF" + csvContent // BOM để không lỗi font tiếng Việt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2. API NHẬP FILE CSV (IMPORT / BULK UPDATE)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { csvData, shop_id } = req.body as any;

    if (!csvData || !shop_id) {
      return res.status(400).json({ error: "Thiếu dữ liệu CSV hoặc Shop ID" });
    }

    const lines = csvData.split(/\r?\n/);
    if (lines.length <= 1) {
      return res.status(400).json({ error: "File CSV không có dữ liệu" });
    }

    const parseCsvLine = (text: string) => {
      const p = RegExp(/("([^"]|"")*")|[^,]+/g);
      const matches = text.match(p) || [];
      return matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseCsvLine(lines[0]).map((h: string) => h.toLowerCase());
    
    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCsvLine(line);
      const rowData: any = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = values[index] || "";
      });

      if (!rowData.sku) continue; 

      const payload = {
        sku: rowData.sku.trim(),
        design_front_url: rowData.design_front_url || null,
        design_back_url: rowData.design_back_url || null,
        mockup_url: rowData.mockup_url || null,
        shop_id: shop_id
      };

      const existing = await sellerService.listSellerDesigns({ sku: payload.sku, shop_id });

      if (existing && existing.length > 0) {
        await sellerService.updateSellerDesigns({
          id: existing[0].id,
          ...payload
        });
        updatedCount++;
      } else {
        await sellerService.createSellerDesigns(payload);
        createdCount++;
      }
    }

    res.json({
      status: "success",
      message: `Xử lý file CSV thành công! Đã tạo mới: ${createdCount} | Đã cập nhật: ${updatedCount}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
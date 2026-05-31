import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const escapeCSV = (str: any) => {
  if (str === null || str === undefined) return '""';
  const stringified = String(str);
  return `"${stringified.replace(/"/g, '""')}"`;
};

// 1. API XUẤT FILE CSV (EXPORT)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const blanks = await sellerService.listPodBlanks({}, { order: { sku: "ASC" } });

    // Định nghĩa header cho file CSV với các trường biến thể mới
    const headers = [
      "sku", "name", "image_url", "material", "in_stock", 
      "display_price", "description", "colors", "sizes", "out_of_stock_variants"
    ];
    let csvContent = headers.join(",") + "\n";

    // Chuyển đổi data thành các dòng CSV
    blanks.forEach((b: any) => {
      const row = [
        escapeCSV(b.sku),
        escapeCSV(b.name),
        escapeCSV(b.image_url),
        escapeCSV(b.material),
        b.in_stock ? "TRUE" : "FALSE",
        b.display_price || 0,
        escapeCSV(b.description),
        escapeCSV(JSON.stringify(b.colors || [])),
        escapeCSV(JSON.stringify(b.sizes || [])),
        escapeCSV(JSON.stringify(b.out_of_stock_variants || []))
      ];
      csvContent += row.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=pod_blanks_catalog.csv");
    res.send("\uFEFF" + csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2. API NHẬP FILE CSV (BULK UPLOAD / EDIT)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { csvData } = req.body as any;

    if (!csvData) {
      return res.status(400).json({ error: "Không tìm thấy dữ liệu CSV" });
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

    const parseJSONField = (val: string) => {
      if (!val) return [];
      try { 
        return JSON.parse(val); 
      } catch (e) { 
        // Fallback nếu người dùng nhập chuỗi tay thay vì JSON
        return val.split(',').map(s => s.trim()).filter(Boolean); 
      }
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

      const blankPayload = {
        sku: rowData.sku.trim(),
        name: rowData.name ? rowData.name.trim() : "Chưa đặt tên phôi",
        image_url: rowData.image_url ? rowData.image_url.trim() : null,
        material: rowData.material ? rowData.material.trim() : null,
        in_stock: rowData.in_stock ? rowData.in_stock.toUpperCase() === "TRUE" : true,
        display_price: rowData.display_price ? Number(rowData.display_price) : 0,
        description: rowData.description || null,
        colors: parseJSONField(rowData.colors),
        sizes: parseJSONField(rowData.sizes),
        out_of_stock_variants: parseJSONField(rowData.out_of_stock_variants)
      };

      const existing = await sellerService.listPodBlanks({ sku: blankPayload.sku });

      if (existing && existing.length > 0) {
        await sellerService.updatePodBlanks({
          id: existing[0].id,
          ...blankPayload
        });
        updatedCount++;
      } else {
        await sellerService.createPodBlanks(blankPayload);
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
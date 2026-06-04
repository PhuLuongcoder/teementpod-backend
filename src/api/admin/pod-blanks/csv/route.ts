import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const escapeCSV = (str: any) => {
  if (str === null || str === undefined) return '""';
  const stringified = String(str);
  return `"${stringified.replace(/"/g, '""')}"`;
};

// 1. XUẤT CSV
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const blanks = await sellerService.listPodBlanks({}, { order: { sku: "ASC" } });

    const headers = [
      "sku", "name", "image_url", "material", "in_stock", 
      "display_price", "description", "colors", "sizes", "out_of_stock_variants"
    ];
    let csvContent = headers.join(",") + "\n";

    blanks.forEach((b: any) => {
      const row = [
        escapeCSV(b.sku), escapeCSV(b.name), escapeCSV(b.image_url), escapeCSV(b.material),
        b.in_stock ? "TRUE" : "FALSE", b.display_price || 0, escapeCSV(b.description),
        escapeCSV(JSON.stringify(b.colors || [])), escapeCSV(JSON.stringify(b.sizes || [])), escapeCSV(JSON.stringify(b.out_of_stock_variants || []))
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

// 2. NHẬP CSV BẰNG THUẬT TOÁN NÂNG CAO (HỖ TRỢ MULTI-LINE)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { csvData } = req.body as any;

    if (!csvData) return res.status(400).json({ error: "Không tìm thấy dữ liệu CSV" });

    // Thuật toán parse CSV đọc xuyên qua dấu Enter (Multi-line) trong ô
    const parseCSVContent = (text: string) => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++; 
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentCell);
          currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++; 
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
      }
      return rows.map(row => row.map(cell => cell.trim()));
    };

    const lines = parseCSVContent(csvData);
    if (lines.length <= 1) return res.status(400).json({ error: "File CSV không có dữ liệu" });

    const headers = lines[0].map((h: string) => h.toLowerCase());
    
    const parseJSONField = (val: string) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch (e) { return val.split(',').map(s => s.trim()).filter(Boolean); }
    };

    let createdCount = 0; let updatedCount = 0; let skipCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length === 1 && !values[0]) continue; // Bỏ qua dòng trống

      const rowData: Record<string, string> = {};
      headers.forEach((header: string, index: number) => { 
        rowData[header] = values[index] !== undefined ? values[index] : ""; 
      });

      if (!rowData.sku || rowData.sku.length < 2) { 
        skipCount++; continue; 
      }

      let safePrice = 0;
      if (rowData.display_price) {
        const parsedPrice = parseFloat(rowData.display_price);
        if (!isNaN(parsedPrice)) safePrice = parsedPrice;
      }

      const blankPayload = {
        sku: String(rowData.sku).trim(), 
        name: rowData.name ? String(rowData.name).trim() : "Chưa đặt tên",
        image_url: rowData.image_url ? String(rowData.image_url).trim() : null, 
        material: rowData.material ? String(rowData.material).trim() : null,
        in_stock: rowData.in_stock ? rowData.in_stock.toUpperCase() === "TRUE" : true, 
        display_price: safePrice,
        category: "Khác", // <--- THÊM BIẾN NÀY ĐỂ FIX LỖI 500
        description: rowData.description ? String(rowData.description).trim() : null, 
        colors: parseJSONField(rowData.colors),
        sizes: parseJSONField(rowData.sizes), 
        out_of_stock_variants: parseJSONField(rowData.out_of_stock_variants)
      };

      const existing = await sellerService.listPodBlanks({ sku: blankPayload.sku });

      if (existing && existing.length > 0) {
        await sellerService.updatePodBlanks({ id: existing[0].id, ...blankPayload }); 
        updatedCount++;
      } else {
        await sellerService.createPodBlanks(blankPayload); 
        createdCount++;
      }
    }

    res.json({ 
      status: "success", 
      message: `Thành công! Đã tạo mới: ${createdCount} | Cập nhật: ${updatedCount} ${skipCount > 0 ? '| Bỏ qua lỗi: ' + skipCount : ''}` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// 1. API XUẤT FILE CSV (EXPORT)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const prices = await sellerService.listPodPrices({}, { order: { product_type: "ASC", size: "ASC" } });

    // Định nghĩa các cột Header cho file CSV
    let csvContent = "product_type,size,base_cost,extra_print_cost\n";

    // Chuyển đổi dữ liệu thành các dòng CSV
    prices.forEach((p: any) => {
      const productType = p.product_type ? `"${p.product_type.replace(/"/g, '""')}"` : "";
      const size = p.size ? `"${p.size.replace(/"/g, '""')}"` : "";
      const baseCost = p.base_cost || 0;
      const extraPrintCost = p.extra_print_cost || 0;

      csvContent += `${productType},${size},${baseCost},${extraPrintCost}\n`;
    });

    // Trả về file định dạng CSV kèm ký tự BOM tránh lỗi font tiếng Việt trên Excel
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=pod_prices_catalog.csv");
    res.send("\uFEFF" + csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2. API NHẬP FILE CSV (BULK UPLOAD & EDIT)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { csvData } = req.body as any;

    if (!csvData) {
      return res.status(400).json({ error: "Không tìm thấy dữ liệu CSV" });
    }

    const lines = csvData.split(/\r?\n/);
    if (lines.length <= 1) {
      return res.status(400).json({ error: "File CSV trống dữ liệu" });
    }

    // Hàm bổ trợ bóc tách dòng dữ liệu CSV có chứa dấu ngoặc kép bọc chuỗi
    const parseCsvLine = (text: string) => {
      const p = RegExp(/("([^"]|"")*")|[^,]+/g);
      const matches = text.match(p) || [];
      return matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseCsvLine(lines[0]).map((h: string) => h.toLowerCase().trim());
    
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

      if (!rowData.product_type || !rowData.size) continue;

      const pricePayload = {
        product_type: rowData.product_type.trim(),
        size: rowData.size.trim(),
        base_cost: rowData.base_cost ? Number(rowData.base_cost) : 0,
        extra_print_cost: rowData.extra_print_cost ? Number(rowData.extra_print_cost) : 0
      };

      // Đối chiếu kiểm tra xem cặp Product Type + Size này đã tồn tại chưa
      const existing = await sellerService.listPodPrices({ 
        product_type: pricePayload.product_type,
        size: pricePayload.size
      });

      if (existing && existing.length > 0) {
        // Trùng cấu hình cũ -> Cập nhật đè giá mới (Bulk Edit)
        await sellerService.updatePodPrices({
          id: existing[0].id,
          ...pricePayload
        });
        updatedCount++;
      } else {
        // Chưa có -> Tạo mới biểu phí (Bulk Import)
        await sellerService.createPodPrices(pricePayload);
        createdCount++;
      }
    }

    res.json({
      status: "success",
      message: `Xử lý dữ liệu CSV thành công! Đã thêm mới: ${createdCount} | Đã cập nhật: ${updatedCount}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
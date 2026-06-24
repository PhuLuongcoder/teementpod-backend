import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

// 1. API XUẤT FILE CSV (EXPORT)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id } = req.query as any;

    if (!shop_id) {
      return res.status(400).json({ error: "Thiếu thông tin shop_id" });
    }

    // --- KHỐI BẢO MẬT: XÁC THỰC TOKEN & QUYỀN SỞ HỮU ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Truy cập bị từ chối: Vui lòng đăng nhập lại!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }

    const sellerShops = await sellerService.listShops({ seller_id: currentSellerId });
    if (!sellerShops.find((s: any) => s.id === shop_id)) {
      return res.status(403).json({ error: "Forbidden: Bạn không có quyền tải dữ liệu của Shop này!" });
    }
    // ----------------------------------------------------

    // Lấy toàn bộ thiết kế của shop
    const designs = await sellerService.listSellerDesigns(
      { shop_id }, 
      { order: { created_at: "DESC" } }
    );

    // BỔ SUNG: Cột extra_print_areas
    const headers = ["sku", "design_front_url", "design_back_url", "mockup_url", "extra_print_areas"];
    let csvContent = headers.join(",") + "\n";

    const escapeCSV = (str: any) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    // Chuyển đổi data thành các dòng CSV
    designs.forEach((d: any) => {
      // Đóng gói các vùng in phụ thành chuỗi thân thiện với Excel: "Tay Trái::Link1 | Tay Phải::Link2"
      let extraAreasStr = "";
      if (d.extra_print_areas && Array.isArray(d.extra_print_areas)) {
        extraAreasStr = d.extra_print_areas
          .filter((a: any) => a.name || a.url)
          .map((a: any) => `${a.name || ''}::${a.url || ''}`)
          .join(" | ");
      }

      const row = [
        escapeCSV(d.sku),
        escapeCSV(d.design_front_url),
        escapeCSV(d.design_back_url),
        escapeCSV(d.mockup_url),
        escapeCSV(extraAreasStr) // Ghi chuỗi vùng in phụ vào CSV
      ];
      csvContent += row.join(",") + "\n";
    });

    res.json({ 
      status: "success", 
      csvData: "\uFEFF" + csvContent 
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

    // --- KHỐI BẢO MẬT: XÁC THỰC TOKEN & QUYỀN SỞ HỮU ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Truy cập bị từ chối: Vui lòng đăng nhập lại!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }

    const sellerShops = await sellerService.listShops({ seller_id: currentSellerId });
    if (!sellerShops.find((s: any) => s.id === shop_id)) {
      return res.status(403).json({ error: "Forbidden: Bạn không có quyền nhập dữ liệu vào Shop này!" });
    }
    // ----------------------------------------------------

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

      // BỔ SUNG: Giải mã lại cột extra_print_areas
      let parsedExtraAreas: any[] = [];
      if (rowData.extra_print_areas) {
        // Thuật toán hỗ trợ cả 2 chuẩn: Chuẩn chuỗi "Tên::Link" và Chuẩn JSON nguyên thủy
        if (rowData.extra_print_areas.startsWith('[')) {
          try { parsedExtraAreas = JSON.parse(rowData.extra_print_areas); } catch(e) {}
        } else {
          const parts = rowData.extra_print_areas.split('|');
          parsedExtraAreas = parts.map((part: string) => {
            const [name, url] = part.split('::');
            return { name: (name || '').trim(), url: (url || '').trim() };
          }).filter((a: any) => a.name || a.url);
        }
      }

      const payload = {
        sku: rowData.sku.trim(),
        design_front_url: rowData.design_front_url || null,
        design_back_url: rowData.design_back_url || null,
        mockup_url: rowData.mockup_url || null,
        extra_print_areas: parsedExtraAreas.length > 0 ? parsedExtraAreas : null, // Ghi nhận vùng in phụ
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

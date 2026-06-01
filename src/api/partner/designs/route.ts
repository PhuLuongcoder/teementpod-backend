import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id, search, page = "1" } = req.query as any;

    if (!shop_id) {
      return res.status(400).json({ error: "Vui lòng chọn Cửa hàng (shop_id)!" });
    }

    // Cấu hình phân trang (10 item/trang)
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    // Cấu hình bộ lọc
    let filters: any = { shop_id };
    if (search) {
      filters.sku = { $ilike: `%${search}%` };
    }
    const [designs, count] = await sellerService.listAndCountSellerDesigns(
      filters,
      { 
        skip,
        take: limit,
        order: { created_at: "DESC" } 
      }
    );

    res.json({ 
      status: "success", 
      designs,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error: any) {
    console.error("❌ LỖI TRUY XUẤT THƯ VIỆN:", error.message);
    res.status(500).json({ error: error.message });
  }
}

// [POST] Thêm mới hoặc Cập nhật đè dữ liệu thiết kế theo SKU
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { id, sku, design_front_url, design_back_url, mockup_url, shop_id } = req.body as {
    id?: string;
    sku: string;
    design_front_url?: string;
    design_back_url?: string;
    mockup_url?: string;
    shop_id: string;
  };

    if (!shop_id || !sku) {
      return res.status(400).json({ error: "Thiếu thông tin shop_id hoặc SKU sản phẩm!" });
    }

    let design;
    if (id) {
      // Nếu truyền ID -> Chỉnh sửa trực tiếp
      design = await sellerService.updateSellerDesigns({
        id,
        sku: sku.trim(),
        design_front_url: design_front_url || null,
        design_back_url: design_back_url || null,
        mockup_url: mockup_url || null,
      });
    } else {
      // Nếu không truyền ID -> Kiểm tra trùng SKU trong Shop đó trước
      const existing = await sellerService.listSellerDesigns({ sku: sku.trim(), shop_id });
      
      if (existing.length > 0) {
        // Trùng -> Cập nhật đè link mới lên
        design = await sellerService.updateSellerDesigns({
          id: existing[0].id,
          design_front_url: design_front_url || existing[0].design_front_url,
          design_back_url: design_back_url || existing[0].design_back_url,
          mockup_url: mockup_url || existing[0].mockup_url,
        });
      } else {
        // Chưa có -> Tạo mới hoàn toàn
        design = await sellerService.createSellerDesigns({
          sku: sku.trim(),
          shop_id,
          design_front_url: design_front_url || null,
          design_back_url: design_back_url || null,
          mockup_url: mockup_url || null,
        });
      }
    }

    res.json({ status: "success", design });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

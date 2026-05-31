import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    const shop_id = req.query.shop_id as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    
    if (!shop_id) {
      return res.status(400).json({ error: "Thiếu shop_id" });
    }

    let filters: any = { shop_id: shop_id };
    
    // 1. Giữ bộ lọc trạng thái nếu có
    if (status && status !== 'all') {
      filters.status = status;
    }
    
    // 2. Giữ bộ lọc tìm kiếm theo mã đơn nếu có
    if (search) {
      filters.external_order_id = { $ilike: `%${search}%` };
    }
    
    // 3. Xử lý logic khoảng thời gian theo yêu cầu đặc biệt
    if (startDate || endDate) {
      filters.order_date = {};
      if (startDate) {
        filters.order_date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.order_date.$lte = end;
      }
    } else {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); 
      filters.order_date = {
        $gte: startOfMonth,
        $lte: now
      };
    }

    // 4. Gọi hàm lấy TOÀN BỘ đơn hàng thỏa mãn điều kiện (bỏ qua take/skip phân trang)
    const orders = await sellerService.listSellerOrders(filters, {
      order: { created_at: "DESC" }
    });

    res.json({
      status: "success",
      orders
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
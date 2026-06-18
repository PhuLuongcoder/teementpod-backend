import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const page = parseInt(req.query.page as string) || 1;
    
    // --- BẮT ĐẦU SỬA: LINH HOẠT XỬ LÝ LIMIT ĐỂ PHỤC VỤ XUẤT FILE CSV ---
    let limit = 10; // Mặc định hiển thị 10 đơn trên phân trang
    if (req.query.limit === "all" || req.query.limit === "999999") {
      limit = 999999; // Mở khóa giới hạn khi bấm xuất CSV
    } else if (req.query.limit) {
      limit = parseInt(req.query.limit as string);
    }
    
    const skip = limit >= 999999 ? 0 : (page - 1) * limit;
    // --- KẾT THÚC SỬA ---

    // 💡 LẤY THÊM BIẾN has_tracking TỪ TRÌNH DUYỆT GỬI LÊN
    const { shop_id, seller_id, search, startDate, endDate, status, has_tracking } = req.query as any;
    let filters: any = {};

    if (shop_id) filters.shop_id = shop_id;
    if (status && status !== 'all') filters.status = status;
    if (search) filters.external_order_id = { $ilike: `%${search}%` };

    // --- BẮT ĐẦU: LOGIC LỌC ĐƠN CÓ/CHƯA CÓ TRACKING ---
    if (status === 'in_transit' && has_tracking && has_tracking !== 'all') {
      if (has_tracking === 'true') {
        // ✅ Đã có mã: Ép Database tìm các đơn có tracking_number KHÁC null
        // (Dùng $not của TypeORM/Medusa)
        filters.tracking_number = { $not: null }; 
      } else if (has_tracking === 'false') {
        // ❌ Chưa có mã: Tìm các đơn bị bỏ trống Tracking
        filters.tracking_number = null; 
      }
    }
    // --- KẾT THÚC ---

    if (startDate || endDate) {
      filters.order_date = {};
      if (startDate) filters.order_date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.order_date.$lte = end;
      }
    }

    const [orders, count] = await sellerService.listAndCountSellerOrders(filters, { 
      order: { created_at: "DESC" },
      skip,
      take: limit,
      relations: ["shop", "shop.seller"] 
    });

    res.json({ orders, count, totalPages: Math.ceil(count / limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerService = req.scope.resolve("sellerModuleService") as any;
  // Bổ sung type cho các action mới
  const { order_ids, action } = req.body as { 
    order_ids: string[], 
    action: 'approve' | 'reject' | 'delete' | 'unapprove' | 'restore' 
  };

  if (!order_ids || order_ids.length === 0) {
    return res.status(400).json({ message: "Danh sách ID trống" });
  }

  try {
    if (action === 'delete') {
      await sellerService.deleteSellerOrders(order_ids);
      return res.json({ status: "success", message: `Đã xóa vĩnh viễn các đơn hàng chọn.` });
    }

    let newStatus: string = 'pending';
    
    // ĐỒNG BỘ LOGIC TRẠNG THÁI:
    if (action === 'approve') {
      newStatus = 'processing'; // Admin duyệt -> Chuyển sang Đang sản xuất
    } else if (action === 'reject') {
      newStatus = 'cancelled'; // Admin từ chối -> Đã hủy
    } else if (action === 'unapprove') {
      newStatus = 'complete'; // Hủy duyệt (Đang sản xuất -> Trở lại Chờ duyệt / Đã thanh toán)
    } else if (action === 'restore') {
      newStatus = 'complete'; // Khôi phục đơn bị hủy -> Trở lại Chờ duyệt / Đã thanh toán
    }

    const updatedOrders = await Promise.all(
      order_ids.map(id => sellerService.updateSellerOrders({ id, status: newStatus }))
    );

    res.json({ status: "success", updatedCount: updatedOrders.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

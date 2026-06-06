import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // --- 1. KHỐI BẢO MẬT: TỰ GIẢI MÃ TOKEN ĐỂ LẤY SELLER_ID ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Chưa đăng nhập hoặc thiếu Token!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }
    // -----------------------------------------------------------
    
    const shop_id = req.query.shop_id as string;
    const range = (req.query.range as string) || 'month';

    const filters: any = {};
    
    // --- 2. XỬ LÝ LỌC THEO QUYỀN SỞ HỮU CỬA HÀNG (MULTI-TENANT FIX) ---
    if (shop_id) {
      const shopCheck = await sellerService.listShops({ id: shop_id, seller_id: currentSellerId });
      if (shopCheck.length === 0) {
        return res.status(403).json({ error: "Bạn không có quyền truy cập dữ liệu của cửa hàng này!" });
      }
      filters.shop_id = shop_id; 
    } else {
      const myShops = await sellerService.listShops({ seller_id: currentSellerId });
      
      if (myShops.length === 0) {
        return res.json({
          stats: { total_revenue: 0, total_orders: 0, avg_order_value: 0, support_stats: { orders: 0, amount: 0 }, current_debt: 0, total_paid: 0 },
          payment_history: [], charts: { revenue: [], status: [] }
        });
      }
      
      const myShopIds = myShops.map((s: any) => s.id);
      filters.shop_id = myShopIds; 
    }

    // ==========================================
    // 3. TÍNH TOÁN KHOẢNG THỜI GIAN THEO LỊCH CHUẨN (CALENDAR)
    // ==========================================
    const now = new Date();
    let startDate = new Date();
    
    if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'all') {
      startDate = new Date(2000, 0, 1); 
    }
    if (range !== 'all') {
      filters.order_date = { $gte: startDate };
    }
    
    const orders = await sellerService.listSellerOrders(filters);

    // ==========================================
    // MỚI: ĐỊNH NGHĨA DANH SÁCH TRẠNG THÁI ĐÃ THANH TOÁN 
    // ==========================================
    const paidStatuses = ['complete', 'processing', 'in_transit', 'done', 'delivered'];
    let total_supported_orders = 0;
    let total_saved_amount = 0;
    
    const total_revenue = orders.reduce((sum: number, order: any) => {
      // Công thức: Giá hiển thị Seller = Giá DB - Phí xử lý đơn
      const displayPrice = Math.max(0, Number(order.order_price || 0) - perOrderFee);

      if (order.status === 'support') {
        total_supported_orders++;
        total_saved_amount += displayPrice; // Trừ luôn ở khối support
      }
      if (paidStatuses.includes(order.status)) {
        return sum + displayPrice; // Trừ phí khỏi tổng doanh thu
      }
      return sum;
    }, 0);

    const total_orders = orders.length;

    // ==========================================
    // 4. CHIA BUCKET (CỘT BIỂU ĐỒ) THEO LỊCH THỰC TẾ
    // ==========================================
    let revenueBuckets: Record<string, { revenue: number, orders: number }> = {};
    
    if (range === 'month') {
      revenueBuckets = { 'Tuần 1': { revenue:0, orders:0 }, 'Tuần 2': { revenue:0, orders:0 }, 'Tuần 3': { revenue:0, orders:0 }, 'Tuần 4': { revenue:0, orders:0 } };
    } else if (range === 'quarter') {
      const startMonth = startDate.getMonth() + 1;
      revenueBuckets = { 
        [`Tháng ${startMonth}`]: { revenue:0, orders:0 }, 
        [`Tháng ${startMonth + 1}`]: { revenue:0, orders:0 }, 
        [`Tháng ${startMonth + 2}`]: { revenue:0, orders:0 } 
      };
    } else {
      revenueBuckets = { 'Q1': { revenue:0, orders:0 }, 'Q2': { revenue:0, orders:0 }, 'Q3': { revenue:0, orders:0 }, 'Q4': { revenue:0, orders:0 } };
    }

    orders.forEach((order: any) => {
      const orderDate = new Date(order.order_date);
      const isPaid = paidStatuses.includes(order.status);
      const displayPrice = Math.max(0, Number(order.order_price || 0) - perOrderFee);
      const price = isPaid ? displayPrice : 0;

      let bucketKey = '';
      
      if (range === 'month') {
        const date = orderDate.getDate();
        if (date <= 7) bucketKey = 'Tuần 1';
        else if (date <= 14) bucketKey = 'Tuần 2';
        else if (date <= 21) bucketKey = 'Tuần 3';
        else bucketKey = 'Tuần 4';
      } 
      else if (range === 'quarter') {
        bucketKey = `Tháng ${orderDate.getMonth() + 1}`;
      } 
      else {
        const q = Math.floor(orderDate.getMonth() / 3) + 1;
        bucketKey = `Q${q}`;
      }

      if (revenueBuckets[bucketKey]) {
        revenueBuckets[bucketKey].revenue += price;
        revenueBuckets[bucketKey].orders += 1;
      }
    });

    const revenueChart = Object.keys(revenueBuckets).map(key => ({
      name: key,
      revenue: Number(revenueBuckets[key].revenue.toFixed(2)),
      orders: revenueBuckets[key].orders
    }));

    // ==========================================
    // 5. CHUẨN BỊ DỮ LIỆU BIỂU ĐỒ TRÒN (STATUS)
    // ==========================================
    const statusMap: Record<string, { name: string, value: number, color: string }> = {
      'pending': { name: 'Chờ thanh toán', value: 0, color: '#f59e0b' },
      'complete': { name: 'Đã thanh toán', value: 0, color: '#0ea5e9' },
      'processing': { name: 'Đang sản xuất', value: 0, color: '#8b5cf6' },
      'in_transit': { name: 'Đang giao', value: 0, color: '#f97316' },
      'done': { name: 'Hoàn thành', value: 0, color: '#10b981' },
      'delivered': { name: 'Hoàn thành', value: 0, color: '#10b981' },
      'cancelled': { name: 'Đã hủy', value: 0, color: '#ef4444' },
      'return': { name: 'Hoàn trả', value: 0, color: '#ef4444' },
    };

    orders.forEach((order: any) => {
      const st = order.status || 'pending';
      if (statusMap[st]) {
        statusMap[st].value += 1;
      }
    });

    const consolidatedStatusMap: Record<string, { name: string, value: number, color: string }> = {};
    Object.values(statusMap).forEach(item => {
      if (item.value > 0) {
        if (consolidatedStatusMap[item.name]) {
          consolidatedStatusMap[item.name].value += item.value;
        } else {
          consolidatedStatusMap[item.name] = { ...item };
        }
      }
    });
    
    const statusChart = Object.values(consolidatedStatusMap);

    // ==========================================
    // 6. TÍNH TOÁN CÔNG NỢ & LỊCH SỬ THANH TOÁN
    // ==========================================
    const paymentHistory = await sellerService.listPaymentHistories(
      filters.shop_id ? { shop_id: filters.shop_id } : {}, 
      { order: { created_at: "DESC" } } 
    ) || [];

    const total_paid = paymentHistory.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const allTimeOrders = await sellerService.listSellerOrders(filters.shop_id ? { shop_id: filters.shop_id } : {});
    let total_debt_generated = 0;
    allTimeOrders.forEach((o: any) => {
      if (paidStatuses.includes(o.status)) {
        const displayPrice = Math.max(0, Number(o.order_price || 0) - perOrderFee);
        total_debt_generated += displayPrice; // Công nợ Seller thấy đã được trừ phí
      }
    });

    const current_debt = total_debt_generated - total_paid;
    let special_discount = "$0";
    let discount_note = "Hạng thành viên tiêu chuẩn";
    
    try {
      const currentSeller = await sellerService.retrieveSeller(currentSellerId);
      const perOrderFee = currentSeller?.per_order_fee || 0;
      if (currentSeller) {
        special_discount = currentSeller.special_discount || "$0";
        discount_note = currentSeller.discount_note || "Hạng thành viên tiêu chuẩn";
      }
    } catch (e) {
      console.error("Lỗi khi lấy thông tin ưu đãi Seller:", e);
    }
    // ==========================================
    // 7. TRẢ KẾT QUẢ VỀ FRONTEND
    // ==========================================
    res.json({
      stats: {
        total_revenue: Number(total_revenue.toFixed(2)),
        total_orders: total_orders,
        avg_order_value: total_orders > 0 ? Number((total_revenue / total_orders).toFixed(2)) : 0,
        support_stats: {
          orders: total_supported_orders,
          amount: Number(total_saved_amount.toFixed(2))
        },
        current_debt: Number(current_debt.toFixed(2)),
        total_paid: Number(total_paid.toFixed(2)),
        special_discount: special_discount,
        discount_note: discount_note
      },
      payment_history: paymentHistory, 
      charts: {
        revenue: revenueChart,
        status: statusChart
      }
    });

  } catch (error: any) {
    console.error("LỖI API DASHBOARD:", error);
    res.status(500).json({ message: error.message });
  }
}

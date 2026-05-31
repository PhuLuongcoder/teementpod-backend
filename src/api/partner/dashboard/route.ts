import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    const shop_id = req.query.shop_id as string;
    const range = (req.query.range as string) || 'month';

    const filters: any = {};
    if (shop_id) {
      filters.shop_id = shop_id; 
    }

    // ==========================================
    // 1. TÍNH TOÁN KHOẢNG THỜI GIAN THEO LỊCH CHUẨN (CALENDAR)
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
    // (Bỏ qua pending, cancelled, return)
    // ==========================================
    const paidStatuses = ['complete', 'processing', 'in_transit', 'done', 'delivered'];
    let total_supported_orders = 0;
    let total_saved_amount = 0;
    // Tính toán KPI Tổng quan cho Card (CHỈ CỘNG TIỀN ĐƠN ĐÃ THANH TOÁN)
    const total_revenue = orders.reduce((sum: number, order: any) => {
      // Đếm số lượng đơn hỗ trợ và tổng số tiền seller tiết kiệm được
      if (order.status === 'support') {
        total_supported_orders++;
        total_saved_amount += Number(order.order_price || 0);
      }
      // Tính tổng doanh thu
      if (paidStatuses.includes(order.status)) {
        return sum + Number(order.order_price || 0);
      }
      return sum;
    }, 0);

    const total_orders = orders.length;

    // ==========================================
    // 2. CHIA BUCKET (CỘT BIỂU ĐỒ) THEO LỊCH THỰC TẾ
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

    // Phân bổ đơn hàng vào đúng cột
    orders.forEach((order: any) => {
      const orderDate = new Date(order.order_date);
      
      // CHỈ CỘNG TIỀN VÀO BIỂU ĐỒ NẾU ĐƠN ĐÃ THANH TOÁN
      const isPaid = paidStatuses.includes(order.status);
      const price = isPaid ? Number(order.order_price || 0) : 0;

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
        revenueBuckets[bucketKey].orders += 1; // Số lượng đơn hàng (Cột xanh lá) thì vẫn đếm đủ để biết lượng traffic
      }
    });

    const revenueChart = Object.keys(revenueBuckets).map(key => ({
      name: key,
      revenue: Number(revenueBuckets[key].revenue.toFixed(2)),
      orders: revenueBuckets[key].orders
    }));

    // ==========================================
    // 3. CHUẨN BỊ DỮ LIỆU BIỂU ĐỒ TRÒN (STATUS)
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

    // Gom các status bị trùng định nghĩa (VD: done và delivered)
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
    // 4. TÍNH TOÁN TĂNG TRƯỞNG ĐƠN HÀNG (THÁNG NÀY VS THÁNG TRƯỚC)
    // ==========================================
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const baseFilter = shop_id ? { shop_id } : {};

    const [currentMonthOrders, lastMonthOrders] = await Promise.all([
      sellerService.listSellerOrders({ ...baseFilter, order_date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } }),
      sellerService.listSellerOrders({ ...baseFilter, order_date: { $gte: startOfLastMonth, $lte: endOfLastMonth } })
    ]);

    const currentCount = currentMonthOrders.length;
    const lastCount = lastMonthOrders.length;

    let growthRate = 0;
    if (lastCount === 0) {
      growthRate = currentCount > 0 ? 100 : 0;
    } else {
      growthRate = ((currentCount - lastCount) / lastCount) * 100;
    }

    const order_growth = {
      current: currentCount,
      last: lastCount,
      growth: Math.abs(parseFloat(growthRate.toFixed(1))),
      isUp: growthRate >= 0
    };
    const paymentHistory = await sellerService.listPaymentHistories(
      shop_id ? { shop_id } : {}, 
      { order: { created_at: "DESC" } } 
    ) || [];

    // ==========================================
    // 6. TRẢ KẾT QUẢ VỀ FRONTEND
    // ==========================================
    const total_paid = paymentHistory.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    // Tính tổng nợ phát sinh toàn thời gian
    const allTimeOrders = await sellerService.listSellerOrders(shop_id ? { shop_id } : {});
    let total_debt_generated = 0;
    allTimeOrders.forEach((o: any) => {
      // Chỉ tính nợ các đơn đã qua giai đoạn Pay
      if (paidStatuses.includes(o.status)) {
        total_debt_generated += Number(o.order_price || 0);
      }
    });

    // Công nợ hiện tại = Tổng nợ phát sinh - Tổng đã trả
    const current_debt = total_debt_generated - total_paid;

    // ==========================================
    // 6. TRẢ KẾT QUẢ VỀ FRONTEND
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
        total_paid: Number(total_paid.toFixed(2))      
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
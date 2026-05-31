// teementpod/src/api/admin/finance/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 1. Lấy tất cả danh sách Seller cùng với các Shop trực thuộc
    const sellers = await sellerService.listSellers({}, { relations: ["shops"] }) || [];
    const paidStatuses = ['complete', 'processing', 'in_transit', 'done', 'delivered'];

    const financeData = await Promise.all(sellers.map(async (seller: any) => {
      let sellerTotalDebt = 0;
      let sellerTotalPaid = 0;
      let sellerOrderCount = 0;

      const shopsData = await Promise.all((seller.shops || []).map(async (shop: any) => {
        const orders = await sellerService.listSellerOrders({ shop_id: shop.id }) || [];
        let shopDebt = 0;
        let shopOrderCount = 0;

        orders.forEach((o: any) => {
          if (paidStatuses.includes(o.status)) {
            shopDebt += Number(o.order_price || 0);
            shopOrderCount++;
          }
        });

        const payments = await sellerService.listPaymentHistories({ shop_id: shop.id }) || [];
        const shopPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const shopCurrentDebt = shopDebt - shopPaid;

        sellerTotalDebt += shopDebt;
        sellerTotalPaid += shopPaid;
        sellerOrderCount += shopOrderCount;

        return {
          shop_id: shop.id,
          shop_name: shop.name,
          total_debt_generated: shopDebt,
          total_paid: shopPaid,
          current_debt: shopCurrentDebt,
          successful_orders_count: shopOrderCount
        };
      }));

      return {
        seller_id: seller.id,
        seller_name: seller.name || [seller.last_name, seller.first_name].filter(Boolean).join(" ") || seller.username || "Chưa đặt tên",
        total_debt: sellerTotalDebt,
        total_paid: sellerTotalPaid,
        current_debt: sellerTotalDebt - sellerTotalPaid,
        orders_count: sellerOrderCount,
        shops: shopsData
      };
    }));

    // 2. Kéo toàn bộ lịch sử thanh toán để hiển thị bảng tra cứu toàn cục
    const allPayments = await sellerService.listPaymentHistories({}, {
      order: { created_at: "DESC" },
      take: 50
    }) || [];

    const shopsList = await sellerService.listShops() || [];
    const shopMap = new Map(shopsList.map((s: any) => [s.id, s.name]));
    
    const detailedPayments = allPayments.map((p: any) => ({
      ...p,
      shop_name: shopMap.get(p.shop_id) || "Cửa hàng đã xóa"
    }));

    res.json({ 
      status: "success", 
      sellers_finance: financeData,
      recent_payments: detailedPayments
    });
  } catch (error: any) {
    console.error("LỖI API ADMIN FINANCE:", error);
    res.status(500).json({ error: error.message });
  }
}
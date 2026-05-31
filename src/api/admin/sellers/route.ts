import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id, range } = req.query as { shop_id?: string, range: string };

    // ==========================================
    // 1. Kéo danh sách Seller cho UI Admin
    // ==========================================
    const sellers = await sellerService.listSellers({}, {
      relations: ["shops"]
    });

    // ==========================================
    // 2.Tính toán Stats & Charts
    // ==========================================
    const filters: any = {};
    if (shop_id) filters.shop_id = shop_id;
    const orders = await sellerService.listSellerOrders(filters);

    const revenueChart = [
      { name: 'T1', revenue: 4000, orders: 240 },
      // ... logic loop qua orders để cộng dồn tiền theo tháng ...
    ];

    const statusSummary = [
      { name: 'Hoàn thành', value: 310, color: '#10b981' },
      // ... logic đếm status ...
    ];

    // ==========================================
    // 3. TRẢ VỀ TẤT CẢ (Gộp chung payload)
    // ==========================================
    res.json({
      status: "success",
      sellers: sellers,     
      stats: {            
        total_revenue: 12500,
        total_orders: 450,
        avg_order_value: 27.5,
      },
      charts: {
        revenue: revenueChart,
        status: statusSummary
      }
    });

  } catch (error: any) {
    console.error("❌ LỖI API /ADMIN/SELLERS:", error.message);
    res.status(500).json({ error: error.message });
  }
}
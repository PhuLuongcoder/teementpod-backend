import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { order_ids } = req.body as { order_ids: string[] };

    if (!order_ids || order_ids.length === 0) {
      return res.status(400).json({ error: "Vui lòng chọn ít nhất một đơn hàng để thanh toán." });
    }

    let paidCount = 0;

    for (const id of order_ids) {
      const order = await sellerService.retrieveSellerOrder(id);
      
      // Chỉ cho phép thanh toán khi đơn hàng đang ở trạng thái pending
      if (order && order.status === "pending") {
        await sellerService.updateSellerOrders({
          id: order.id,
          status: "complete" // Chuyển đổi trạng thái sau khi pay thành công
        });
        paidCount++;
      }
    }

    res.json({
      status: "success",
      message: `Thanh toán thành công! Đã chuyển tiếp ${paidCount} đơn hàng sang hệ thống xử lý của Admin xưởng.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
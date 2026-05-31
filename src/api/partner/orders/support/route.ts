import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerService = req.scope.resolve("sellerModuleService") as any;
  const { order_ids, type, reason, proof_image } = req.body as {
    order_ids: string[];
    type: "resent" | "refund";
    reason: string;
    proof_image: string;
  };

  if (!order_ids || order_ids.length === 0) {
    return res.status(400).json({ error: "Danh sách đơn hàng trống" });
  }

  try {
    await Promise.all(
      order_ids.map(async (id) => {
        const order = await sellerService.retrieveSellerOrder(id).catch(() => null);
        if (!order) return;

        const orderPrice = Number(order.order_price || 0);
        const shopId = order.shop_id;

        // Chuẩn bị nội dung text sẽ lưu vào DB
        const noteContent = `[Yêu cầu: ${type === "refund" ? "Hoàn tiền" : "Đi lại"}] Lý do: ${reason}. Minh chứng: ${proof_image}`;
        
        console.log(`[API SUPPORT] Đang cập nhật trạng thái đơn ${order.external_order_id || id}...`);
        console.log(`[API SUPPORT] Dữ liệu Ghi chú (order_note) sẽ lưu:`, noteContent);

        // Cập nhật trạng thái và order_note
        await sellerService.updateSellerOrders({ 
          id: order.id, 
          status: "support",
          order_note: noteContent 
        });

        // Khấu trừ / Ghi nhận sổ cái
        await sellerService.createPaymentHistories({
          shop_id: shopId,
          amount: type === "refund" ? -orderPrice : 0, 
          billing_cycle: `Hạch toán Hỗ trợ - Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
          total_successful_orders: 1,
          note: `Khấu trừ lệnh ${type === "refund" ? "HOÀN TIỀN" : "ĐI LẠI"} cho đơn hàng #${order.external_order_id || id}`
        });
      })
    );

    res.json({ status: "success", message: "Đã gửi yêu cầu và lưu minh chứng thành công!" });
  } catch (error: any) {
    console.error("[API SUPPORT] LỖI:", error);
    res.status(500).json({ error: error.message });
  }
}
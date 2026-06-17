import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { order_ids } = req.body as { order_ids: string[] };

    if (!order_ids || order_ids.length === 0) {
      return res.status(400).json({ error: "Vui lòng chọn ít nhất một đơn hàng để thanh toán." });
    }

    let paidCount = 0;
    let failedOrders: string[] = [];

    for (const id of order_ids) {
      const order = await sellerService.retrieveSellerOrder(id);
      
      // Chỉ xử lý đơn hàng đang pending
      if (!order || order.status !== "pending") {
        continue;
      }

      // 🛡️ CHỐT CHẶN 1: TỪ CHỐI ĐƠN 0 ĐỒNG HOẶC NULL
      if (!order.order_price || order.order_price <= 0) {
        failedOrders.push(`${order.external_order_id} (Lỗi: Đơn giá $0)`);
        continue; // Bỏ qua đơn này, chuyển sang đơn tiếp theo
      }

      // 🛡️ CHỐT CHẶN 2: KIỂM TRA SẢN PHẨM BỊ RỖNG
      let items: any[] = [];
      try {
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          items = order.items;
        } else if (order.product_detail) {
          const pd = typeof order.product_detail === 'string' ? JSON.parse(order.product_detail) : order.product_detail;
          if (Array.isArray(pd)) items = pd;
          else if (pd && Array.isArray(pd.items)) items = pd.items;
          else items = [pd];
        }
      } catch (e) {
        console.error("Lỗi parse items:", e);
      }

      if (!items || items.length === 0) {
        failedOrders.push(`${order.external_order_id} (Lỗi: Đơn rỗng)`);
        continue;
      }

      /* * 💡 CHÚ Ý QUAN TRỌNG: TRỪ TIỀN SELLER
       * Bác bắt buộc phải thêm logic kiểm tra và trừ tiền ví (Wallet/Balance) của Seller ở đây!
       * * Ví dụ giả lập:
       * const seller = await sellerService.retrieveSeller(order.seller_id);
       * if (seller.balance < order.order_price) {
       * failedOrders.push(`${order.external_order_id} (Lỗi: Số dư không đủ)`);
       * continue;
       * }
       * await sellerService.deductBalance(order.seller_id, order.order_price);
       */

      // Nếu vượt qua mọi bài test, tiến hành duyệt đơn!
      await sellerService.updateSellerOrders({
        id: order.id,
        status: "complete" // Chuyển đổi trạng thái sau khi pay thành công
      });
      paidCount++;
    }

    // Xử lý thông báo trả về cho Frontend
    if (paidCount === 0) {
      return res.status(400).json({ 
        error: `Giao dịch thất bại! Không có đơn nào hợp lệ để thanh toán.\nLý do: ${failedOrders.join(', ')}` 
      });
    }

    const warningMsg = failedOrders.length > 0 
      ? `\n⚠️ Hệ thống đã từ chối ${failedOrders.length} đơn lỗi: ${failedOrders.join(', ')}` 
      : "";

    res.json({
      status: "success",
      message: `Thanh toán thành công! Đã chuyển tiếp ${paidCount} đơn hàng sang hệ thống xử lý của Admin xưởng.${warningMsg}`
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

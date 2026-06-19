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

      // 🛡️ BƯỚC 1: Bóc tách giỏ hàng
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

      // 🛡️ LỚP THÉP 1: Chặn mảng rỗng
      if (!items || items.length === 0) {
        failedOrders.push(`${order.external_order_id} (Lỗi: Dữ liệu sản phẩm rỗng)`);
        continue;
      }

      // 🛡️ LỚP THÉP 2: Quét nội soi từng sản phẩm (Chặn tuyệt đối lỗi 3 trường)
      let isItemsValid = true;
      for (const item of items) {
        // Hàm .trim() sẽ gọt sạch các khoảng trắng (Space) nếu Seller cố tình lách luật
        const type = (item.type || "").trim();
        const color = (item.color || "").trim();
        const size = (item.size || "").trim();
        const front = (item.design_front || "").trim();
        const back = (item.design_back || "").trim();

        // Rớt đài nếu thiếu 1 trong 3 trường, HOẶC thiếu cả 2 mặt thiết kế
        if (!type || !color || !size || (!front && !back)) {
          isItemsValid = false;
          break;
        }
      }

      if (!isItemsValid) {
        failedOrders.push(`${order.external_order_id} (Lỗi: Chưa chọn đủ Phôi/Màu/Size hoặc thiếu Link Design)`);
        continue;
      }

      // 🛡️ LỚP THÉP 3: Ép kiểu dữ liệu và chặn đơn $0
      const price = Number(order.order_price || 0);
      if (isNaN(price) || price <= 0) {
        failedOrders.push(`${order.external_order_id} (Lỗi: Đơn giá $0 không hợp lệ)`);
        continue;
      }

      // Nếu vượt qua 3 lớp thép trên -> Đơn chuẩn 100%, cho phép cập nhật!
      await sellerService.updateSellerOrders({
        id: order.id,
        status: "complete" 
      });
      paidCount++;
    }

    // --- TRẢ KẾT QUẢ CHO SELLER ---
    if (paidCount === 0) {
      // Nếu tất cả đơn gửi lên đều là đơn 0Đ / lỗi
      return res.status(400).json({ 
        error: `Giao dịch thất bại! Các đơn hàng chưa đủ điều kiện:\n\n- ${failedOrders.join('\n- ')}` 
      });
    }

    const warningMsg = failedOrders.length > 0 
      ? `\n\n⚠️ Hệ thống đã từ chối ${failedOrders.length} đơn lỗi:\n- ${failedOrders.join('\n- ')}` 
      : "";

    res.json({
      status: "success",
      message: `Thanh toán thành công! Đã chuyển ${paidCount} đơn sang xưởng sản xuất.${warningMsg}`
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

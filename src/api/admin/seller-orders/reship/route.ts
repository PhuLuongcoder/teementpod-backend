import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // Nhận data từ giao diện Admin truyền xuống
    const { order_ids, cost_policy, reason } = req.body as { 
      order_ids: string[], 
      cost_policy: 'free' | 'half' | 'full',
      reason?: string
    };

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ error: "Vui lòng chọn ít nhất 1 đơn hàng để reship." });
    }

    const newOrders: any[] = [];

    // Lặp qua từng ID đơn hàng được chọn để xử lý
    for (const id of order_ids) {
      // 1. Lấy thông tin chi tiết của đơn gốc
      const originalOrder = await sellerService.retrieveSellerOrder(id);
      
      // 2. Tính toán lại chi phí cho đơn mới dựa trên policy Admin chọn
      let newOrderPrice = originalOrder.order_price;
      let newShippingCost = originalOrder.shipping_cost;

      if (cost_policy === 'free') {
        newOrderPrice = 0;
        newShippingCost = 0;
      } else if (cost_policy === 'half') {
        newOrderPrice = originalOrder.order_price / 2;
        // Tùy theo logic xưởng, ở đây tạm chia đôi cả tiền ship
        newShippingCost = originalOrder.shipping_cost / 2; 
      }

      // 3. Xử lý Logic Tiền tố "RS-" (Reship)
      let newDisplayId = originalOrder.display_id ? `RS-${originalOrder.display_id}` : `RS-${originalOrder.id.substring(0, 8)}`;
      let newExternalId = originalOrder.external_order_id ? `RS-${originalOrder.external_order_id}` : `RS-${originalOrder.id}`;

      // Xử lý ngoại lệ: Nếu bản thân đơn gốc đã là đơn Reship (đi lại lần 2), ta đổi thành RS2- để khỏi bị dài dòng RS-RS-
      if (originalOrder.display_id && originalOrder.display_id.startsWith("RS-")) {
         newDisplayId = `RS2-${originalOrder.display_id.replace("RS-", "")}`;
      }
      if (originalOrder.external_order_id && originalOrder.external_order_id.startsWith("RS-")) {
         newExternalId = `RS2-${originalOrder.external_order_id.replace("RS-", "")}`;
      }

      // 4. Tạo bản ghi đơn hàng mới (Clone)
      const reshipOrder = await sellerService.createSellerOrders({
        external_order_id: newExternalId,
        display_id: newDisplayId,
        
        // Liên kết đúng shop của đơn gốc
        shop_id: originalOrder.shop_id || (originalOrder.shop && originalOrder.shop.id), 
        
        // --- LOGIC PHÂN BIỆT ĐƠN BẢO HÀNH ---
        order_type: "reshipment",
        parent_order_id: originalOrder.id,
        support_reason: reason || "Admin duyệt đi lại đơn",
        
        // --- THÔNG TIN TÀI CHÍNH & TRẠNG THÁI ---
        order_price: newOrderPrice,
        shipping_cost: newShippingCost,
        status: "processing", // Đẩy thẳng vào xưởng sản xuất
        order_date: new Date(),
        
        // --- CLONE DỮ LIỆU SẢN PHẨM VÀ KHÁCH HÀNG TỪ ĐƠN GỐC ---
        customer_name: originalOrder.customer_name,
        customer_email: originalOrder.customer_email,
        customer_phone: originalOrder.customer_phone,
        shipping_address: originalOrder.shipping_address,
        product_type: originalOrder.product_type,
        items: originalOrder.items,
        design_front_url: originalOrder.design_front_url,
        design_back_url: originalOrder.design_back_url,
        special_print_areas: originalOrder.special_print_areas,
      });

      // 5. Tùy chọn: Chuyển trạng thái đơn gốc sang "support" (bảo hành) để dễ filter
      await sellerService.updateSellerOrders({
        id: originalOrder.id,
        status: "done"
      });

      newOrders.push(reshipOrder);
    }

    res.json({ 
      status: "success", 
      message: `Đã xử lý xong. Tạo thành công ${newOrders.length} đơn Reship!`, 
      data: newOrders 
    });

  } catch (error: any) {
    console.error("Lỗi tạo đơn reship:", error);
    res.status(500).json({ error: error.message });
  }
}
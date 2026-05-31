import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerService = req.scope.resolve("sellerModuleService") as any;
  const eventBus = req.scope.resolve(Modules.EVENT_BUS) as any;
  const { tracking_data } = req.body as { tracking_data: any[] };

  try {
    let successCount = 0;

    for (const data of tracking_data) {
      const orders = await sellerService.listSellerOrders({ external_order_id: data.external_order_id });
      if (orders.length > 0) {
        const order = orders[0];
        
        // BẢO VỆ TRẠNG THÁI: Chỉ cập nhật thành In Transit nếu đơn không nằm trong nhóm chốt (support, cancelled, done)
        const newStatus = ['support', 'cancelled', 'done'].includes(order.status) 
          ? order.status 
          : 'in_transit';

        await sellerService.updateSellerOrders({
          id: order.id,
          tracking_number: data.tracking_number,
          shipping_carrier: data.carrier,
          status: newStatus, 
          shipped_date: new Date()
        });

        successCount++;

        await eventBus.emit({
          name: "seller_order.tracking_added",
          data: {                             
            shop_id: order.shop_id,
            order_id: order.external_order_id,
            tracking_number: data.tracking_number,
            carrier: data.carrier,
            timestamp: new Date()
          }
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Đồng bộ thành công! Đã cập nhật tracking cho ${successCount} đơn hàng.` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
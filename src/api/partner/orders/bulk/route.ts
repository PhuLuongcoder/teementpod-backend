import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerService = req.scope.resolve("sellerModuleService") as any;
  
  const { ids, action } = req.body as { ids: string[], action: 'cancel' | 'archive' };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Không có ID đơn hàng nào được cung cấp." });
  }

  try {
    if (action === 'cancel' || action === 'archive') {
      let successCount = 0;
      
      // Kiểm tra từng đơn hàng trước khi cho phép hủy
      for (const id of ids) {
        const order = await sellerService.listSellerOrders({ id });
        if (!order || order.length === 0) continue;
        
        const currentStatus = order[0].status;

        // CHỐT CHẶN BẢO VỆ: Chỉ cho phép hủy đơn nháp (pending) hoặc vừa chốt (complete)
        if (currentStatus === 'pending' || currentStatus === 'complete' || currentStatus === 'support' || !currentStatus) {
          await sellerService.updateSellerOrders({ id, status: 'cancelled' });
          successCount++;
        }
      }

      res.json({ 
        success: true, 
        message: `Đã hủy thành công ${successCount}/${ids.length} đơn. Các đơn đang sản xuất hoặc đã giao sẽ bị từ chối hủy.` 
      });
    } else {
      res.status(400).json({ message: "Hành động không hợp lệ." });
    }
    
  } catch (error: any) {
    console.error("Lỗi xử lý hàng loạt:", error);
    res.status(500).json({ 
      message: "Lỗi hệ thống khi xử lý dữ liệu", 
      error: error.message 
    });
  }
}
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { result_image_url } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    if (!result_image_url) {
      return res.status(400).json({ error: "Thiếu link file kết quả (result_image_url)." });
    }

    // Kiểm tra xem đơn hàng có tồn tại không
    const existingReqs = await sellerService.listServiceRequests({ id });
    if (!existingReqs || existingReqs.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu thiết kế này." });
    }

    // Cập nhật link kết quả và ép trạng thái sang "waiting_approval" (Đợi duyệt)
    const updatedRequest = await sellerService.updateServiceRequests({
      id,
      result_image_url,
      status: "waiting_approval"
    });

    res.json({ 
      status: "success", 
      message: "Đã giao file thiết kế thành công!", 
      request: updatedRequest 
    });
  } catch (error: any) {
    console.error("LỖI GIAO FILE THIẾT KẾ (ADMIN):", error);
    res.status(500).json({ error: error.message });
  }
}

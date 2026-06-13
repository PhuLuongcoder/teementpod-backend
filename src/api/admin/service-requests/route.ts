import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // Lấy toàn bộ yêu cầu thiết kế của hệ thống, đơn mới nhất sẽ nổi lên đầu
    const requests = await sellerService.listServiceRequests(
      {}, 
      { order: { created_at: "DESC" } }
    );
    
    res.json({ status: "success", requests });
  } catch (error: any) {
    console.error("LỖI LẤY DANH SÁCH ĐƠN THIẾT KẾ (ADMIN):", error);
    res.status(500).json({ error: error.message });
  }
}

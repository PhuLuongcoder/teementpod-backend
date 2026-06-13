import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { action, revision_note } = req.body as any; // action: 'approve' | 'revise'
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    // Xác thực
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;

    // Kiểm tra quyền sở hữu
    const existingReq = await sellerService.listServiceRequests({ id, seller_id: decoded.seller_id });
    if (!existingReq || existingReq.length === 0) return res.status(403).json({ error: "Không tìm thấy yêu cầu hoặc không có quyền." });

    if (action === "approve") {
      // Seller chốt đơn
      await sellerService.updateServiceRequests({
        id,
        status: "completed"
      });
      return res.json({ status: "success", message: "Đã duyệt thiết kế thành công!" });
    } 
    
    if (action === "revise") {
      // Seller yêu cầu sửa lại, trả về in_process cho Admin thấy
      if (!revision_note) return res.status(400).json({ error: "Thiếu nội dung yêu cầu sửa đổi." });
      
      await sellerService.updateServiceRequests({
        id,
        status: "in_process",
        revision_note: revision_note
      });
      return res.json({ status: "success", message: "Đã gửi yêu cầu điều chỉnh cho Admin!" });
    }

    res.status(400).json({ error: "Action không hợp lệ" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

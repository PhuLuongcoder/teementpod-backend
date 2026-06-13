import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 1. Xác thực Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
    const seller_id = decoded.seller_id;

    // 2. Lấy danh sách yêu cầu của Seller này
    const requests = await sellerService.listServiceRequests(
      { seller_id }, 
      { order: { created_at: "DESC" } }
    );
    
    // 3. Tính tổng công nợ chưa thanh toán (Để hiển thị lên góc phải UI)
    const unpaidRequests = requests.filter((r: any) => r.payment_status === "unpaid");
    const totalDebt = unpaidRequests.reduce((sum: number, req: any) => sum + Number(req.price), 0);

    res.json({ status: "success", requests, total_debt: totalDebt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
    const seller_id = decoded.seller_id;

    // Khai báo duy nhất 1 lần ở đây
    const { service_id, type, quantity, instructions, original_image_url, price } = req.body as any;

    if (!original_image_url) {
      return res.status(400).json({ error: "Thiếu link ảnh gốc" });
    }

    // --- KHỐI BẢO MẬT & KIỂM TRA ĐẦU VÀO ---
    // 1. Kiểm tra độ dài (Tránh spam data rác)
    if (original_image_url.length > 1000) {
      return res.status(400).json({ error: "Link quá dài, vui lòng sử dụng link rút gọn hợp lệ." });
    }

    // 2. Ép kiểu URL chuẩn (Chống XSS)
    const urlPattern = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
    if (!urlPattern.test(original_image_url)) {
      return res.status(400).json({ error: "Link ảnh không hợp lệ. Vui lòng nhập đúng định dạng http:// hoặc https://" });
    }
    // ----------------------------------------

    // Tạo bản ghi - Ghi nhận công nợ (unpaid) và Trạng thái chờ Admin (in_process)
    const newRequest = await sellerService.createServiceRequests({
      seller_id,
      service_id,
      type,
      quantity: Number(quantity) || 1,
      price: Number(price) || 0,
      instructions: instructions || "",
      original_image_url,
      status: "in_process",
      payment_status: "unpaid"
    });

    res.json({ status: "success", request: newRequest });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

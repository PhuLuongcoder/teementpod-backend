import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Không tìm thấy token!" });

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "super-secret-key-teement";
    const decoded = jwt.verify(token, secret) as any;

    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const sellers = await sellerService.listSellers({ id: decoded.seller_id });

    if (sellers.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng!" });

    res.json({
      status: "success",
      user: { id: sellers[0].id, username: sellers[0].username, first_name: sellers[0].first_name, last_name: sellers[0].last_name, phone: sellers[0].phone }
    });
  } catch (error: any) {
    res.status(401).json({ error: "Xác thực thất bại hoặc phiên hết hạn!" });
  }
}
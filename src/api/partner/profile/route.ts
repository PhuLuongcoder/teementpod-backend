import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Lỗi Token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
    const seller_id = decoded.seller_id;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    const { first_name, last_name, phone, username, current_password, new_password } = req.body as any; 

    // Kiểm tra trùng username nếu seller muốn đổi
    if (username) {
      const existing = await sellerService.listSellers({ username });
      if (existing.length > 0 && existing[0].id !== seller_id) {
        return res.status(400).json({ error: "Tên đăng nhập này đã có người sử dụng!" });
      }
    }

    const updatePayload: any = {
      id: seller_id,
      ...(first_name !== undefined && { first_name }),
      ...(last_name !== undefined && { last_name }),
      ...(username !== undefined && { username }),
      ...(phone !== undefined && { phone })
    };

    if (current_password && new_password) {
      const sellers = await sellerService.listSellers({ id: seller_id });
      const isMatch = await bcrypt.compare(current_password, sellers[0].password_hash);
      if (!isMatch) return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác!" });

      updatePayload.password_hash = await bcrypt.hash(new_password, await bcrypt.genSalt(10));
    }

    const updatedProfile = await sellerService.updateSellers(updatePayload);
    res.json({ status: "success", profile: updatedProfile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
export const POST = PUT;
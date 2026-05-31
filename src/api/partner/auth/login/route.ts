import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { username, password } = req.body as any;

    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    const sellers = await sellerService.listSellers({ username });
    if (sellers.length === 0) {
      return res.status(401).json({ error: "Tài khoản không tồn tại!" });
    }

    const seller = sellers[0];
    const isMatch = await bcrypt.compare(password, seller.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Mật khẩu không chính xác!" });
    }

    const secret = process.env.JWT_SECRET || "super-secret-key-teement";
    const token = jwt.sign({ seller_id: seller.id, username: seller.username }, secret, {
      expiresIn: "7d",
    });

    res.json({
      status: "success", message: "Đăng nhập thành công!", token,
      user: { id: seller.id, username: seller.username, first_name: seller.first_name, last_name: seller.last_name, phone: seller.phone }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
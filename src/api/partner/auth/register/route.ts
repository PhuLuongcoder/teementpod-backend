import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { username, password, first_name, last_name, phone } = req.body as any;

    if (!username || !password) {
      return res.status(400).json({ error: "Tên đăng nhập và mật khẩu là bắt buộc!" });
    }

    const existingSellers = await sellerService.listSellers({ username });
    if (existingSellers.length > 0) {
      return res.status(400).json({ error: "Tên đăng nhập này đã được sử dụng!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newSeller = await sellerService.createSellers({
      username, password_hash: hashedPassword, first_name, last_name, phone,
    });

    const secret = process.env.JWT_SECRET || "super-secret-key-teement";
    const token = jwt.sign({ seller_id: newSeller.id, username: newSeller.username }, secret, { expiresIn: "7d" });

    res.status(201).json({
      status: "success", message: "Đăng ký tài khoản thành công!", token,
      user: { id: newSeller.id, username: newSeller.username, first_name: newSeller.first_name, last_name: newSeller.last_name }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
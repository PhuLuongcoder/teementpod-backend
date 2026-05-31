import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils" // Import bộ hằng số chuẩn của Medusa

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // 1. In ra Terminal để xác nhận request đã chạy tới đây
    console.log("[Seller Portal] Đang yêu cầu lấy danh sách sản phẩm...");

    // 2. Gọi Module Sản phẩm bằng hằng số chuẩn (Không lo gõ sai chữ)
    const productService = req.scope.resolve(Modules.PRODUCT);

    // 3. Lấy sản phẩm
    const products = await productService.listProducts();

    console.log(`[Thành công] Đã tìm thấy ${products.length} sản phẩm. Trả về Frontend!`);

    res.json({
      status: "success",
      products: products
    });

  } catch (error: any) {
    // Nếu có lỗi, in đỏ rực ra Terminal Backend để chúng ta đọc
    console.error("LỖI NGHIÊM TRỌNG TẠI API /partner/products:", error.message);
    console.error(error.stack); // In cả gốc rễ lỗi
    
    res.status(500).json({ 
      error: "Lỗi nội bộ server, hãy xem Terminal Backend!",
      details: error.message 
    });
  }
}
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { name, is_active, logo_url, tax_id } = req.body as any;
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    console.log("=== ĐANG NHẬN LỆNH TỪ FRONTEND ===");
    console.log(`- Nhắm vào Shop ID: ${id}`);
    console.log(`- Dữ liệu truyền lên:`, { name, is_active, logo_url, tax_id });

    // Gom các trường cần cập nhật lại
    const updatePayload: any = { id };

    if (name) updatePayload.name = name.trim();
    if (typeof is_active !== 'undefined') updatePayload.is_active = is_active;
    if (typeof logo_url !== 'undefined') updatePayload.logo_url = logo_url.trim();
    if (typeof tax_id !== 'undefined') updatePayload.tax_id = tax_id.trim();

    console.log(`- Đang chuẩn bị lưu vào DB:`, updatePayload);

    const updatedShop = await sellerService.updateShops(updatePayload);

    console.log(`- Cập nhật thành công! Trạng thái hiện tại: is_active = ${updatedShop.is_active}`);
    console.log("===================================");

    res.json({ status: "success", shop: updatedShop });
  } catch (error: any) {
    console.error("❌ LỖI API CẬP NHẬT SHOP:", error.message);
    res.status(500).json({ error: error.message });
  }
}
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    await sellerService.deleteShops([id]);

    res.json({ status: "success", message: "Đã xóa cửa hàng thành công" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
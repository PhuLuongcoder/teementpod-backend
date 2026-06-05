import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { shop_id, amount, billing_cycle, total_successful_orders, note } = req.body as any;

    if (!shop_id || amount === undefined) {
      return res.status(400).json({ error: "Thiếu Shop ID hoặc số tiền thanh toán" });
    }

    // --- BẮT ĐẦU ĐOẠN CHỈNH SỬA (CHỐT BẢO MẬT DỮ LIỆU) ---
    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: "Số tiền gạch nợ phải là một số hợp lệ và lớn hơn 0" });
    }
    // --- KẾT THÚC ĐOẠN CHỈNH SỬA ---

    const payment = await sellerService.createPaymentHistories({
      shop_id,
      amount: payAmount, // Dùng biến payAmount đã được kiểm tra ở trên
      billing_cycle: billing_cycle || `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      total_successful_orders: Number(total_successful_orders || 0),
      note: note || "Thanh toán công nợ cuối kỳ"
    });

    res.json({ status: "success", payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

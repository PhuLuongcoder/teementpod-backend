import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as { email: string }

    if (!body.email) {
      return res.status(400).json({ error: "Vui lòng nhập email!" })
    }

    // 1. Gọi Service quản lý Database của Seller
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    // 2. Tìm trong Database xem có ai dùng email này chưa
    const sellers = await sellerService.listSellers({ email: body.email })

    // 3. Nếu mảng rỗng -> Không tìm thấy
    if (!sellers || sellers.length === 0) {
      return res.status(404).json({ error: "Email này chưa được đăng ký!" })
    }

    // 4. Nếu thấy -> Trả về thành công
    res.json({
      status: "success",
      message: "Đăng nhập thành công!",
      data: sellers[0] // Trả về thông tin của Seller đó
    })

  } catch (error: any) {
    console.error("LỖI LOGIN:", error)
    res.status(500).json({ error: error.message })
  }
}
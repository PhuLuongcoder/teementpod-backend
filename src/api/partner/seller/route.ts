import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import createSellerWorkflow from "../../../workflows/create-seller"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as { name: string; email: string }

    if (!body.name || !body.email) {
      return res.status(400).json({ error: "Vui lòng cung cấp đủ tên và email!" })
    }

    const { result } = await createSellerWorkflow(req.scope).run({
      input: {
        name: body.name,   
        email: body.email, 
      },
    })

    res.json({
      status: "success",
      message: "Tạo tài khoản Seller thành công!",
      data: result
    })

  } catch (error: any) {
    console.error("LỖI WORKFLOW:", error)
    res.status(400).json({ error: error.message })
  }
}
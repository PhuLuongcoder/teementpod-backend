import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const services = await sellerService.listServices({}, { order: { created_at: "DESC" } });
    res.json({ status: "success", services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { id, title, description, icon, tags, popular } = req.body as any;

    if (!title) return res.status(400).json({ error: "Thiếu tiêu đề dịch vụ" });

    const payload = {
      title: title.trim(),
      description: description || "",
      icon: icon || "",
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      popular: Boolean(popular),
    };

    let service;
    if (id) {
      service = await sellerService.updateServices({ id, ...payload });
    } else {
      service = await sellerService.createServices(payload);
    }
    res.json({ status: "success", service });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
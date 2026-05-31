import type SellerModuleService from "../modules/seller/service"
import {
  createStep,
  createWorkflow,
  WorkflowResponse,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"

// 1. Khai báo kiểu dữ liệu đầu vào
type CreateSellerInput = {
  name: string
  email: string
}

// 2. Tạo Step thao tác với Database
const createSellerStep = createStep(
  "create-seller-step",
  async (input: CreateSellerInput, { container }) => {
    // SỬA Ở ĐÂY: Gọi tên chuẩn xác 100%
    const sellerService = container.resolve("sellerModuleService") as SellerModuleService
    
    const sellers = await sellerService.createSellers([input])
    return new StepResponse(sellers[0], sellers[0].id)
  }
)

// 3. Tạo Workflow
const createSellerWorkflow = createWorkflow(
  "create-seller-workflow",
  (input: CreateSellerInput) => {
    const seller = createSellerStep(input)
    return new WorkflowResponse(seller)
  }
)

// 4. BẮT BUỘC: Export Default theo đúng chuẩn của tài liệu
export default createSellerWorkflow
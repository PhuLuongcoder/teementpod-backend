import { MedusaService } from "@medusajs/framework/utils"
import { Seller } from "./models/seller"
import { Shop } from "./models/shop"
import { SellerOrder } from "./models/seller-order"
import { SellerDesign } from "./models/seller-design"
import { ShippingPrice } from "./models/shipping-price"
import { PodPrice } from "./models/pod-price"
import { PodBlank } from "./models/pod-blank"
import { PaymentHistory } from "./models/payment-history"
import { Service } from "./models/service"
import { ServiceRequest } from "./models/service-request"
class SellerModuleService extends MedusaService({
  Seller,
  Shop,
  SellerOrder,
  SellerDesign,
  PodPrice,
  ShippingPrice,
  PodBlank,
  PaymentHistory,
  Service,
  ServiceRequest,
}) {
}

export default SellerModuleService

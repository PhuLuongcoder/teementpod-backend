import { ExecArgs } from "@medusajs/framework/types"

export default async function clearAllOrders({ container }: ExecArgs) {
  const sellerService = container.resolve("sellerModuleService") as any;

  console.log("⏳ Đang quét toàn bộ đơn hàng trong hệ thống...");

  // Lấy danh sách toàn bộ ID đơn hàng
  const orders = await sellerService.listSellerOrders(
    {}, 
    { select: ["id"], take: 100000 } // Thiết lập take lớn để lấy hết 1 lần
  );

  if (orders.length === 0) {
    console.log("✅ Database đã sạch, không có đơn hàng nào để xóa.");
    return;
  }

  const orderIds = orders.map((o: any) => o.id);
  console.log(`🗑️ Đang tiến hành xóa ${orderIds.length} đơn hàng...`);

  // Gọi hàm xóa hàng loạt của Medusa
  await sellerService.deleteSellerOrders(orderIds);

  console.log("✅ Hoàn tất! Đã xóa sạch toàn bộ đơn hàng.");
}
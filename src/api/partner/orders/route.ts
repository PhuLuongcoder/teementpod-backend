import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // --- 1. KHỐI BẢO MẬT: TỰ GIẢI MÃ TOKEN ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Truy cập bị từ chối: Vui lòng đăng nhập lại!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }
    // ------------------------------------------

    const shop_id = req.query.shop_id as string;
    
    if (!shop_id) {
       return res.status(400).json({ error: "Thiếu thông tin Cửa hàng (shop_id)." });
    }

    // --- 2. KHỐI BẢO MẬT: KIỂM TRA QUYỀN SỞ HỮU SHOP ---
    // --- 2. KHỐI BẢO MẬT: LẤY TẤT CẢ SHOP THUỘC QUYỀN QUẢN LÝ ---
    const sellerShops = await sellerService.listShops({ seller_id: currentSellerId });
    const sellerShopIds = sellerShops.map((s: any) => s.id);

    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string; 
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let filters: any = {};
    
    if (search) {
      // Khi có từ khóa tìm kiếm (Mã Đơn), quét qua toàn bộ shop thuộc quyền quản lý của seller này
      filters.shop_id = sellerShopIds;
      filters.external_order_id = { $ilike: `%${search}%` };
    } else {
      // Khi không tìm kiếm, giữ nguyên logic bắt buộc truyền shop_id cụ thể và bảo mật như cũ
      if (!shop_id) {
         return res.status(400).json({ error: "Thiếu thông tin Cửa hàng (shop_id)." });
      }
      if (!sellerShopIds.includes(shop_id)) {
        return res.status(403).json({ 
          error: "Forbidden: Rò rỉ dữ liệu bị chặn! Bạn không có quyền xem đơn hàng của shop này." 
        });
      }
      filters.shop_id = shop_id;
    }
    
    if (status && status !== 'all') {
      filters.status = status;
    }
    
    if (search) {
      filters.external_order_id = { $ilike: `%${search}%` };
    }
    
    if (startDate || endDate) {
      filters.order_date = {};
      if (startDate) {
        filters.order_date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.order_date.$lte = end;
      }
    }

    const [orders, count] = await sellerService.listAndCountSellerOrders(
      filters,
      { skip, take: limit, order: { created_at: "DESC" } }
    );

    // =======================================================================
    // MỚI: LẤY THÔNG TIN SELLER ĐỂ LẤY PHÍ ẨN VÀ TRỪ RA TRƯỚC KHI GỬI CHO SELLER
    // =======================================================================
    const sellers = await sellerService.listSellers({ id: currentSellerId });
    const perOrderFee = sellers.length > 0 ? Number(sellers[0].per_order_fee || 0) : 0;

    const modifiedOrders = orders.map((order: any) => {
      const matchingShop = sellerShops.find((s: any) => s.id === order.shop_id);
      return {
        ...order,
        shop_name: matchingShop ? matchingShop.name : "Cửa hàng ẩn", // Thêm tên shop vào dữ liệu đơn
        // Trừ đi phí xử lý đơn để hiển thị giá gốc (không cho kết quả âm)
        order_price: Math.max(0, Number(order.order_price || 0) - perOrderFee)
      };
    });

    res.json({
      status: "success",
      orders: modifiedOrders, // Trả về mảng đơn hàng đã được giấu phí
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService")
    
    // --- 1. KHỐI BẢO MẬT: TỰ GIẢI MÃ TOKEN ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Truy cập bị từ chối: Vui lòng đăng nhập lại!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }
    // ------------------------------------------

    const body = req.body as { orders: any[], target_shop_id: string }
    const { orders: rawOrders, target_shop_id } = body;

    if (!target_shop_id) {
      return res.status(400).json({ error: "Vui lòng chọn Cửa hàng (Shop) trước khi import!" })
    }

    if (!rawOrders || rawOrders.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu đơn hàng nào được gửi lên." })
    }

    // --- 2. KHỐI BẢO MẬT: KIỂM TRA QUYỀN SỞ HỮU SHOP TRƯỚC KHI IMPORT ---
    let markupFee = 0;
    let perOrderFee = 0;
    const currentShopInfo = await sellerService.listShops(
      { id: target_shop_id }, 
      { relations: ["seller"] }
    );

    if (currentShopInfo.length === 0) {
      return res.status(400).json({ error: "Cửa hàng không tồn tại trên hệ thống!" });
    }

    const targetShop = currentShopInfo[0];

    // CHỐT CHẶN RÒ RỈ DỮ LIỆU CHÉO (CROSS-TENANT LEAKAGE)
    if (targetShop.seller_id !== currentSellerId) {
       return res.status(403).json({ 
         error: "Forbidden: Bạn đang cố import đơn hàng vào Cửa hàng của người khác! Hành động đã bị chặn." 
       });
    }

    if (targetShop.is_active === false) {
      return res.status(403).json({ 
        error: `Cửa hàng "${targetShop.name}" hiện đang bị khóa. Không thể tạo thêm đơn hàng mới! Vui lòng liên hệ Admin.` 
      });
    }

    if (targetShop.seller) {
      markupFee = targetShop.seller.markup_fee || 0;
      perOrderFee = Number(targetShop.seller.per_order_fee || 0);
    }
    // -------------------------------------------------------------------

    // 3. SƠ CHẾ VÀ GÁN ĐÚNG SHOP_ID MÀ SELLER ĐÃ CHỌN
    const formattedOrders: any[] = rawOrders.map((order: any) => {
      let parsedAddress: any = {};
      try {
        if (typeof order.shipping_address === 'string') {
          parsedAddress = order.shipping_address.includes('{') 
            ? JSON.parse(order.shipping_address) 
            : { raw: order.shipping_address };
        } else if (typeof order.shipping_address === 'object' && order.shipping_address !== null) {
          // Dữ liệu đã là Object chuẩn từ Frontend gửi lên
          parsedAddress = order.shipping_address;
          
          // Thuật toán "bóc vỏ hành": Tự động dọn dẹp các lớp "raw" lồng nhau do lỗi cũ
          while (parsedAddress.raw && typeof parsedAddress.raw === 'object') {
            parsedAddress = parsedAddress.raw;
          }
        }
      } catch (e) { parsedAddress = { raw: order.shipping_address }; }

      let parsedItems = [];
      try {
        if (order.product_detail) {
           parsedItems = typeof order.product_detail === 'string' ? JSON.parse(order.product_detail) : order.product_detail;
        } else if (order.items) {
           parsedItems = order.items;
        }
      } catch(e) {}

      return {
        external_order_id: order.external_order_id || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        order_price: Number(order.order_price) || 0,
        shipping_cost: 0,
        customer_name: order.customer_name || "Khách Vãng Lai",
        customer_email: order.customer_email || null,
        customer_phone: order.customer_phone || null,
        shipping_address: parsedAddress,
        product_type: order.product_type || "Unknown Product",
        items: parsedItems, 
        design_front_url: order.design_front_url || null,
        design_back_url: order.design_back_url || null,
        mockup_urls: order.mockup_urls || null,
        special_print_areas: order.special_print_areas || null,
        order_note: order.order_note || null,
        status: "pending" as const, 
        order_date: new Date(),
        shop_id: target_shop_id, 
      };
    });

    for (const orderData of formattedOrders) {
      if (!orderData.items || orderData.items.length === 0) continue;

      for (const item of orderData.items) {
        if (!item.sku) continue;

        const hasLinks = item.design_front || item.design_back || item.mockup;
        const existingDesigns = await sellerService.listSellerDesigns({
          sku: item.sku,
          shop_id: target_shop_id
        }) as any[];

        if (hasLinks) {
          if (existingDesigns.length > 0) {
            await sellerService.updateSellerDesigns({
              id: existingDesigns[0].id,
              design_front_url: item.design_front || existingDesigns[0].design_front_url,
              design_back_url: item.design_back || existingDesigns[0].design_back_url,
              mockup_url: item.mockup || existingDesigns[0].mockup_url
            });
          } else {
            await sellerService.createSellerDesigns({
              sku: item.sku,
              shop_id: target_shop_id,
              design_front_url: item.design_front,
              design_back_url: item.design_back,
              mockup_url: item.mockup
            });
          }
        } else {
          if (existingDesigns.length > 0) {
            const lib = existingDesigns[0];
            item.design_front = lib.design_front_url || '';
            item.design_back = lib.design_back_url || '';
            item.mockup = lib.mockup_url || '';
          }
        }
      }
    }

    for (const orderData of formattedOrders) {
      if (!orderData.items || orderData.items.length === 0) continue;

      let totalCalculatedPrice = 0;
      let totalItemsCount = 0; 
      
      // 1. KẾT NỐI DATABASE: Lấy cấu hình giá từ giao diện Admin
      const orderCountry = orderData.shipping_address?.country?.toUpperCase() 
                        || orderData.shipping_address?.country_code?.toUpperCase() 
                        || 'US';

      let shipConfigs = await sellerService.listShippingPrices({
        country_code: orderCountry
      }) as any[];

      if (shipConfigs.length === 0) {
        shipConfigs = await sellerService.listShippingPrices({
          country_code: 'WW' // Nếu không tìm thấy US/CA, mặc định lấy cấu hình của WW (Toàn cầu)
        }) as any[];
      }

      // Nếu chưa cài đặt trên UI, mặc định lấy số 0
      const shipCfg = shipConfigs.length > 0 ? shipConfigs[0] : { first_item_cost: 0, additional_item_cost: 0 };

      // 2. TÍNH TIỀN PHÔI VÀ ĐẾM TỔNG SỐ LƯỢNG SẢN PHẨM
      for (const item of orderData.items) {
        const safeType = item.type ? item.type.trim() : "";
        const safeSize = item.size ? item.size.trim() : "";

        const priceConfigs = await sellerService.listPodPrices({
          product_type: safeType, size: safeSize
        }) as any[];
        
        const config = priceConfigs.length > 0 ? priceConfigs[0] : { base_cost: 0, extra_print_cost: 0 };
        
        let printAreasCount = 0;
        if (item.design_front) printAreasCount++;
        if (item.design_back) printAreasCount++;
        if (item.extra_print_areas && Array.isArray(item.extra_print_areas)) {
          printAreasCount += item.extra_print_areas.length;
        }

        const extraPrints = Math.max(0, printAreasCount - 1);
        const unitPrice = config.base_cost + (extraPrints * config.extra_print_cost) + markupFee; 
        item.unit_price = unitPrice;
        
        const itemQty = item.quantity || 1;
        totalCalculatedPrice += (unitPrice * itemQty);
        totalItemsCount += itemQty; 
      }

      // 3. THUẬT TOÁN TÍNH CHIẾT KHẤU KỲ DIỆU
      // Ép kiểu Number để đảm bảo an toàn toán học
      const firstItemCost = Number(shipCfg.first_item_cost) || 0;
      const additionalItemCost = Number(shipCfg.additional_item_cost) || 0;

      // Nếu bạn nhập số âm trên UI, biến totalShippingCost sẽ tự động trở thành SỐ ÂM (Chiết khấu)
      const totalShippingCost = firstItemCost + (Math.max(0, totalItemsCount - 1) * additionalItemCost);

      // Gán vào đơn hàng
      orderData.shipping_cost = totalShippingCost; 
      // VẪN GIỮ NGUYÊN PHÍ PER ORDER Ở ĐÂY ĐỂ LƯU VÀO DATABASE CHO ADMIN THẤY
      const calculatedPrice = totalCalculatedPrice + totalShippingCost + perOrderFee;
      orderData.order_price = calculatedPrice > perOrderFee ? calculatedPrice : (orderData.order_price || 0);
    }

    const extractedIds = formattedOrders.map((o: any) => o.external_order_id);
    
    const existingOrders = await sellerService.listSellerOrders({
      external_order_id: extractedIds,
      shop_id: target_shop_id
    });
    
    const existingOrderMap = new Map();
    existingOrders.forEach((o: any) => {
      existingOrderMap.set(o.external_order_id, o.id);
    });
    
    let createdCount = 0;
    let updatedCount = 0;
    const skippedOrderIds: string[] = [];

    for (const orderData of formattedOrders) {
      
      // >>> SỬA TẠI ĐÂY: Trả lại JSON.stringify vì Database của bạn dùng cột String (Text) <<<
      orderData.product_detail = JSON.stringify(orderData.items);

      if (existingOrderMap.has(orderData.external_order_id)) {
        // --- NẾU ĐƠN HÀNG ĐÃ TỒN TẠI -> THỰC HIỆN UPDATE ---
        const internalOrderId = existingOrderMap.get(orderData.external_order_id);
        const { order_date, created_at, updated_at, status, items, ...updatePayload } = orderData; 
        try {
          await sellerService.updateSellerOrders({
            id: internalOrderId,
            ...updatePayload 
          });
          updatedCount++;
        } catch (updateErr) {
          console.error("Lỗi cập nhật đơn hàng:", updateErr);
          skippedOrderIds.push(orderData.external_order_id);
        }
      } else {
        const { items, ...createPayload } = orderData;
        await sellerService.createSellerOrders(createPayload);
        createdCount++;
      }
    }

    let responseMessage = `Đã đồng bộ thành công! (Tạo mới: ${createdCount} đơn, Cập nhật: ${updatedCount} đơn).`;
    
    if (skippedOrderIds.length > 0) {
      const displayIds = skippedOrderIds.slice(0, 5).join(', ');
      const moreText = skippedOrderIds.length > 5 ? `... và ${skippedOrderIds.length - 5} mã khác` : '';
      responseMessage += `\nLỗi/Bỏ qua ${skippedOrderIds.length} đơn: ${displayIds} ${moreText}`;
    }

    res.json({ 
      status: "success", 
      message: responseMessage,
      count: createdCount,
      updated: updatedCount
    });

  } catch (error: any) {
    console.error("LỖI IMPORT ĐƠN HÀNG:", error.message);
    res.status(500).json({ error: error.message })
  }
}

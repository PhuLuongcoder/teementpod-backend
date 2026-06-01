import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    const shop_id = req.query.shop_id as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // 1. HỨNG THÊM THAM SỐ STATUS TỪ FRONTEND
    const status = req.query.status as string; 
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let filters: any = { shop_id: shop_id };
    
    // 2. NHÉT ĐIỀU KIỆN LỌC STATUS VÀO ĐÂY (bỏ qua nếu là 'all')
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

    res.json({
      status: "success",
      orders,
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
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 1. NHẬN DỮ LIỆU TỪ FRONTEND
    const body = req.body as { orders: any[], target_shop_id: string }
    const { orders: rawOrders, target_shop_id } = body;

    // 2. KIỂM TRA BẢO MẬT & DỮ LIỆU
    if (!target_shop_id) {
      return res.status(400).json({ error: "Vui lòng chọn Cửa hàng (Shop) trước khi import!" })
    }

    if (!rawOrders || rawOrders.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu đơn hàng nào được gửi lên." })
    }

    // 3. SƠ CHẾ VÀ GÁN ĐÚNG SHOP_ID MÀ SELLER ĐÃ CHỌN
    const formattedOrders: any[] = rawOrders.map((order: any) => {
      let parsedAddress: any = {};
      try {
        parsedAddress = typeof order.shipping_address === 'string' && order.shipping_address.includes('{') 
          ? JSON.parse(order.shipping_address) 
          : { raw: order.shipping_address };
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


    const outOfStockErrors: string[] = [];
    const unknownProductErrors: string[] = [];

    // TỐI ƯU HIỆU SUẤT: Tải toàn bộ kho phôi 1 lần duy nhất thay vì query DB liên tục trong vòng lặp
    const allBlanks = await sellerService.listPodBlanks({}) as any[];

    for (const order of formattedOrders) {
      if (!order.items || order.items.length === 0) continue;

      for (const item of order.items) {
        // Chuyển dữ liệu CSV về chữ thường (lowercase) để so sánh
        const safeType = item.type ? item.type.trim().toLowerCase() : "";
        const safeSku = item.sku ? item.sku.trim().toLowerCase() : "";
        
        // TÌM KIẾM LINH HOẠT: Ưu tiên khớp SKU trước, nếu không có SKU thì khớp Tên phôi (bất chấp hoa thường)
        const matchedBlank = allBlanks.find(b => 
          (safeSku && b.sku?.toLowerCase() === safeSku) || 
          (safeType && b.name?.toLowerCase() === safeType)
        );

        if (matchedBlank) {
          item.type = matchedBlank.name;

          // Kiểm tra hết hàng toàn bộ phôi
          if (matchedBlank.in_stock === false) {
            outOfStockErrors.push(`Đơn [${order.external_order_id}]: Phôi "${matchedBlank.name}" hiện đang HẾT HÀNG toàn bộ.`);
          } 
          // Kiểm tra hết hàng theo từng phân loại (Color x Size)
          else if (matchedBlank.out_of_stock_variants && Array.isArray(matchedBlank.out_of_stock_variants)) {
            const isVariantOos = matchedBlank.out_of_stock_variants.some(
              (v: any) => v.color?.toLowerCase() === item.color?.trim().toLowerCase() && 
                          v.size?.toLowerCase() === item.size?.trim().toLowerCase()
            );
            
            if (isVariantOos) {
              outOfStockErrors.push(`Đơn [${order.external_order_id}]: Phôi "${matchedBlank.name}" (Màu: ${item.color}, Size: ${item.size}) hiện đang HẾT HÀNG.`);
            }
          }
        } else {
          // Báo lỗi nếu không khớp được cả SKU lẫn Tên
          unknownProductErrors.push(`Đơn [${order.external_order_id}]: Dữ liệu "${item.type || item.sku}" không khớp với bất kỳ SKU hay Tên phôi nào trên hệ thống.`);
        }
      }
    }

    // Nếu mảng lưu lỗi có chứa phần tử -> Tức là phát hiện vi phạm -> Chặn Import ngay lập tức
    if (outOfStockErrors.length > 0 || unknownProductErrors.length > 0) {
      const allErrors = [...outOfStockErrors, ...unknownProductErrors];
      // Cắt ngắn nếu lỗi quá dài (tránh vỡ giao diện popup)
      const displayErrors = allErrors.slice(0, 10).map(err => `• ${err}`).join('\n');
      const moreText = allErrors.length > 10 ? `\n\n... và ${allErrors.length - 10} lỗi khác.` : '';

      return res.status(400).json({ 
        error: `Tải file thất bại! Phát hiện sản phẩm không hợp lệ:\n\n${displayErrors}${moreText}\n\n-> Vui lòng sửa lại file CSV hoặc báo Admin thêm phôi.` 
      });
    }
    // --- KHÔI PHỤC LOGIC XỬ LÝ DESIGN LIBRARY ---
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
    // --- KẾT THÚC LOGIC DESIGN LIBRARY ---

    // TRUY VẤN THÔNG TIN SHOP VÀ MARKUP FEE
    let markupFee = 0;
    const currentShopInfo = await sellerService.listShops(
      { id: target_shop_id }, 
      { relations: ["seller"] }
    );

    // 1. Kiểm tra shop có tồn tại không
    if (currentShopInfo.length === 0) {
      return res.status(400).json({ error: "Cửa hàng không tồn tại trên hệ thống!" });
    }

    const targetShop = currentShopInfo[0];

    // 2. CHẶN ĐỨNG NẾU SHOP ĐÃ BỊ KHÓA
    if (targetShop.is_active === false) {
      return res.status(403).json({ 
        error: `Cửa hàng "${targetShop.name}" hiện đang bị khóa. Không thể tạo thêm đơn hàng mới! Vui lòng liên hệ Admin.` 
      });
    }

    // 3. Lấy phí Markup nếu hợp lệ
    if (targetShop.seller) {
      markupFee = targetShop.seller.markup_fee || 0;
    }

    // --- BẮT ĐẦU KHỐI LOGIC TÍNH GIÁ (ĐÃ FIX LỖI TÌM THEO PRODUCT_TYPE & UNDEFINED) ---
    for (const orderData of formattedOrders) {
      if (!orderData.items || orderData.items.length === 0) continue;

      let totalCalculatedPrice = 0;
      let totalShippingCost = 0; 
      
      const orderCountry = orderData.shipping_address?.country?.toUpperCase() 
                        || orderData.shipping_address?.country_code?.toUpperCase() 
                        || 'US';

      let shipConfigs = await sellerService.listShippingPrices({
        country_code: orderCountry
      }) as any[];

      if (shipConfigs.length === 0) {
        shipConfigs = await sellerService.listShippingPrices({
          country_code: 'WW'
        }) as any[];
      }

      const shipCfg = shipConfigs.length > 0 ? shipConfigs[0] : { first_item_cost: 0, additional_item_cost: 0 };

      for (const item of orderData.items) {
        // BẢO VỆ CHỐNG LỖI KHI DỮ LIỆU CSV BỊ TRỐNG
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

        const itemShippingCost = shipCfg.first_item_cost + (Math.max(0, itemQty - 1) * shipCfg.additional_item_cost);
        totalShippingCost += itemShippingCost;
      }

      orderData.shipping_cost = totalShippingCost;
      orderData.order_price = totalCalculatedPrice + totalShippingCost; 
    }
    // --- KẾT THÚC KHỐI LOGIC TÍNH GIÁ ---

    // 4. LƯU VÀO DATABASE BẰNG CƠ CHẾ UPSERT
    const extractedIds = formattedOrders.map((o: any) => o.external_order_id);
    
    // Truy vấn 1 lần duy nhất để lấy toàn bộ danh sách ID đã tồn tại trong DB của Shop này
    const existingOrders = await sellerService.listSellerOrders({
      external_order_id: extractedIds,
      shop_id: target_shop_id
    });
    
    // Đưa vào Set để tra cứu tốc độ cao (O(1))
    const existingIdSet = new Set(existingOrders.map((o: any) => o.external_order_id));
    
    let createdCount = 0;
    const skippedOrderIds: string[] = [];

    for (const orderData of formattedOrders) {
      if (existingIdSet.has(orderData.external_order_id)) {
        // Đã tồn tại -> Bỏ qua dòng này và đưa ID vào danh sách thông báo
        skippedOrderIds.push(orderData.external_order_id);
        continue;
      }
      
      // Chưa tồn tại -> Tiến hành tạo mới
      await sellerService.createSellerOrders(orderData);
      createdCount++;
    }

    // Xử lý định dạng chuỗi thông báo kết quả trả về cho Seller
    let responseMessage = `Đã đồng bộ thành công ${createdCount} đơn hàng mới!`;
    
    if (skippedOrderIds.length > 0) {
      // Giới hạn hiển thị 5 ID đầu tiên để tránh làm vỡ giao diện UI nếu trùng quá nhiều
      const displayIds = skippedOrderIds.slice(0, 5).join(', ');
      const moreText = skippedOrderIds.length > 5 ? `... và ${skippedOrderIds.length - 5} mã khác` : '';
      responseMessage += `\n Bỏ qua ${skippedOrderIds.length} đơn bị trùng ID: ${displayIds} ${moreText}`;
    }

    res.json({ 
      status: "success", 
      message: responseMessage,
      count: createdCount,
      skipped: skippedOrderIds.length
    });

  } catch (error: any) {
    console.error("LỖI IMPORT ĐƠN HÀNG:", error.message);
    res.status(500).json({ error: error.message })
  }
}

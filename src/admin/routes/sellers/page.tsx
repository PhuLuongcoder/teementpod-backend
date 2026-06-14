import { useState, useEffect, useCallback } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users, Trash, CheckCircleSolid, Spinner, ArrowDownTray, XCircleSolid, ArrowUturnLeft, ArrowUpTray } from "@medusajs/icons"
import { Button, Container, Heading, Text, FocusModal, Badge, clx, Drawer, Input, Label } from "@medusajs/ui"
import Papa from "papaparse"

// 1. CẤU HÌNH MENU BÊN TRÁI CHO MEDUSA ADMIN
export const config = defineRouteConfig({
  label: "Quản lý Seller", // Tên hiển thị trên menu
  icon: Users,             // Icon mặc định của Medusa
})

// 2. GIAO DIỆN CHÍNH
export default function SellersAdminPage() {
  const [sellers, setSellers] = useState<any[]>([])
  const [ordersList, setOrdersList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSellerId, setSelectedSellerId] = useState('')
  // === STATE QUẢN LÝ CHỌN VÀ CHI TIẾT ===
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewingOrder, setViewingOrder] = useState<any | null>(null)
  const [actioningIds, setActioningIds] = useState<string[]>([])
  const [isBulking, setIsBulking] = useState(false)
  const [isSelectAllPages, setIsSelectAllPages] = useState(false)
  // === STATE QUẢN LÝ BỘ LỌC ===
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedShopId, setSelectedShopId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  // === STATE QUẢN LÝ NHÀ IN (PRINTER) ===
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [bulkPrinterName, setBulkPrinterName] = useState('');
  const [updatingPrinterIds, setUpdatingPrinterIds] = useState<string[]>([]);

  // Hàm gọi API cập nhật Nhà In (Dùng chung cho cả Inline và Bulk)
  const handleUpdatePrinter = async (orderIds: string[], printerName: string) => {
    setUpdatingPrinterIds(orderIds);
    try {
      // Giả sử API của bác là POST /admin/seller-orders/bulk-printer
      const res = await fetch('/admin/seller-orders/bulk-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: orderIds,
          printer_name: printerName
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // Cập nhật lại list đơn hàng hiện tại trên state để UI ăn ngay mà không cần reload
        setOrdersList(prev => prev.map(order => 
          orderIds.includes(order.id) ? { ...order, printer_name: printerName } : order
        ));
        setIsPrinterModalOpen(false);
        setBulkPrinterName('');
        setSelectedIds([]); // Bỏ chọn sau khi update bulk xong
      } else {
        alert(`Lỗi: ${data.message || 'Không thể cập nhật Nhà in'}`);
      }
    } catch (error) {
      console.error("Lỗi cập nhật Nhà In:", error);
      alert("Đã xảy ra lỗi mạng khi cập nhật Nhà in.");
    } finally {
      setUpdatingPrinterIds([]);
    }
  };
  // === STATE QUẢN LÝ IMPORT TRACKING ===
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [trackingData, setTrackingData] = useState<any[]>([])
  const [isImportingTracking, setIsImportingTracking] = useState(false)
  const [trackingMessage, setTrackingMessage] = useState('')

  // === STATE QUẢN LÝ RESHIP (BẢO HÀNH) ===
  const [isReshipModalOpen, setIsReshipModalOpen] = useState(false)
  const [reshipPolicy, setReshipPolicy] = useState<'free' | 'half' | 'full'>('free')
  const [reshipReason, setReshipReason] = useState('Xưởng hỗ trợ in lại')
  const [isSubmittingReship, setIsSubmittingReship] = useState(false)

  // === STATE QUẢN LÝ CHỈNH SỬA ĐƠN HÀNG ===
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [editFormData, setEditFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: "",
    order_note: ""
  })

  // Fetch dữ liệu từ 2 API Admin
  const fetchData = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        seller_id: selectedSellerId,
        shop_id: selectedShopId,
        startDate: startDate,
        endDate: endDate,
      });

      if (activeTab === 'reship') {
        params.append('search', searchQuery ? `${searchQuery} RS-` : 'RS-');
      } else {
        if (searchQuery) params.append('search', searchQuery);
        if (activeTab !== 'all') params.append('status', activeTab);
      }

      const [sellersRes, ordersRes] = await Promise.all([
        fetch('/admin/sellers', { credentials: 'include' }).then(res => res.json()),
        fetch(`/admin/seller-orders?${params.toString()}`, { credentials: 'include' }).then(res => res.json())
      ])
      
      setSellers(sellersRes.sellers || [])
      setOrdersList(ordersRes.orders || [])
      setTotalPages(ordersRes.totalPages || 1)
      setTotalCount(ordersRes.count || 0)
    } catch (error) {
      console.error("Lỗi tải dữ liệu Admin:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedShopId, selectedSellerId, searchQuery, startDate, endDate, activeTab])

  const handleAdminToggleShop = async (shop: any) => {
    if(!confirm(`Xác nhận ${shop.is_active !== false ? 'khóa' : 'mở khóa'} shop: ${shop.name}?`)) return;
    await fetch(`/admin/shops/${shop.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: shop.is_active === false })
    });
    fetchData(currentPage);
  };

  const handleAdminDeleteShop = async (shopId: string) => {
    if(!confirm("CẢNH BÁO: Xóa shop này sẽ mất toàn bộ liên kết. Đồng ý?")) return;
    await fetch(`/admin/shops/${shopId}`, { method: "DELETE" });
    fetchData(currentPage);
  };

  const handleUpdateMarkup = async (sellerId: string, currentMarkup: number) => {
    const val = prompt("Nhập phí cộng thêm (Markup) cho Seller này ($):", currentMarkup.toString());
    if(val !== null && !isNaN(Number(val))) {
      await fetch(`/admin/sellers/${sellerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup_fee: Number(val) })
      });
      fetchData(currentPage);
    }
  };
  
  const handleUpdatePerOrderFee = async (sellerId: string, currentFee: number) => {
    const val = prompt("Nhập phí xử lý mỗi đơn hàng (Per Order Fee) cho Seller này ($):", currentFee.toString());
    if(val !== null && !isNaN(Number(val))) {
      await fetch(`/admin/sellers/${sellerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ per_order_fee: Number(val) })
      });
      fetchData(currentPage);
    }
  };
  const handleUpdateDiscount = async (sellerId: string, currentDiscount: string, currentNote: string) => {
    const valDiscount = prompt("Nhập mức ưu đãi hiển thị (VD: $5, $10, Freeship):", currentDiscount || "$0");
    if (valDiscount !== null) {
      const valNote = prompt("Nhập ghi chú hạng thẻ (VD: Seller VIP):", currentNote || "Hạng thành viên tiêu chuẩn");
      if (valNote !== null) {
        await fetch(`/admin/sellers/${sellerId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            special_discount: valDiscount,
            discount_note: valNote
          })
        });
        fetchData(currentPage);
      }
    }
  };
  useEffect(() => {
    fetchData(currentPage)
  }, [fetchData, currentPage])

  const handleReset = () => {
    setSelectedSellerId('');
    setSelectedShopId('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setSelectedIds([]);
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(ordersList.map(o => o.id));
    } else {
      setSelectedIds([]);
      setIsSelectAllPages(false); // Bỏ tích thì tắt luôn chế độ Chọn toàn bộ
    }
  }

  const toggleSelect = (id: string) => {
    // CHẶN: Không cho tích/bỏ tích lẻ tẻ khi đang bật chế độ Chọn toàn bộ
    if (isSelectAllPages) {
      alert("Bạn đang ở chế độ CHỌN TẤT CẢ các trang.\nVui lòng bấm 'Bỏ chọn' (trên thanh công cụ màu đen hoặc thông báo màu xanh) nếu muốn chọn lại từng đơn nhé!");
      return;
    }
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete' | 'unapprove' | 'restore') => {
    // Hiển thị đúng số lượng sẽ bị tác động
    const targetCount = isSelectAllPages ? totalCount : selectedIds.length;
    if (action === 'delete' && !confirm(`Bạn có chắc chắn muốn xóa ${targetCount} đơn hàng?`)) return;
    
    setIsBulking(true);
    try {
      let finalIds = selectedIds;

      // NẾU CHỌN TOÀN BỘ: Tự động tải ngầm toàn bộ ID khớp với bộ lọc
      if (isSelectAllPages) {
        const params = new URLSearchParams({ limit: "999999", shop_id: selectedShopId, seller_id: selectedSellerId });
        if (activeTab !== 'all') params.append('status', activeTab);
        if (searchQuery) params.append('search', searchQuery);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/admin/seller-orders?${params.toString()}`, { credentials: 'include' }).then(r => r.json());
        finalIds = res.orders.map((o: any) => o.id);
      }

      await fetch('/admin/seller-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: finalIds, action })
      });
      
      setSelectedIds([]);
      setIsSelectAllPages(false);
      await fetchData(currentPage);
    } catch (error) {
      console.error("Lỗi thực hiện batch action:", error);
    } finally {
      setIsBulking(false);
    }
  }

  const handlePushStatus = async (new_status: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển các đơn đã chọn sang trạng thái: ${new_status}?`)) return;
    
    setIsBulking(true);
    try {
      const res = await fetch('/admin/seller-orders/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: selectedIds,
          filter_status: activeTab !== 'all' ? activeTab : undefined,
          is_select_all: isSelectAllPages,
          new_status: new_status
        })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        setSelectedIds([]);
        setIsSelectAllPages(false);
        await fetchData(currentPage);
      } else {
        alert(`Lỗi: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error("Lỗi chuyển trạng thái:", error);
      alert("Đã xảy ra lỗi hệ thống khi chuyển trạng thái.");
    } finally {
      setIsBulking(false);
    }
  }

  const handleBulkReship = async () => {
    setIsSubmittingReship(true);
    try {
      let finalIds = selectedIds;
      
      if (isSelectAllPages) {
        const params = new URLSearchParams({ limit: "999999", shop_id: selectedShopId, seller_id: selectedSellerId });
        if (activeTab !== 'all') params.append('status', activeTab);
        if (searchQuery) params.append('search', searchQuery);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/admin/seller-orders?${params.toString()}`, { credentials: 'include' }).then(r => r.json());
        finalIds = res.orders.map((o: any) => o.id);
      }

      const res = await fetch("/admin/seller-orders/reship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: finalIds,
          cost_policy: reshipPolicy,
          reason: reshipReason
        })
      });
      
      const data = await res.json();
      if (data.status === "success") {
        alert(data.message || "Đã đẩy các đơn đi lại vào sản xuất thành công!");
        setIsReshipModalOpen(false); 
        setSelectedIds([]); 
        setIsSelectAllPages(false);
        fetchData(currentPage); 
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi tạo đơn Reship");
    } finally {
      setIsSubmittingReship(false);
    }
  };

  const executeOrderAction = async (orderId: string, action: 'approve' | 'reject' | 'unapprove' | 'restore') => {
    setActioningIds(prev => [...prev, orderId]);
    try {
      await fetch('/admin/seller-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: [orderId], action })
      });
      await fetchData(currentPage);
    } catch (error) {
      console.error(`Lỗi ${action} đơn:`, error);
    } finally {
      setActioningIds(prev => prev.filter(id => id !== orderId));
    }
  }
  
  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/admin/seller-orders/${id}`, { credentials: 'include' }).then(r => r.json());
      setViewingOrder(res.order);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
    }
  }

  // === HÀM XỬ LÝ MỞ DRAWER VÀ SUBMIT EDIT ===
  const handleOpenEditDrawer = () => {
    if (!viewingOrder) return;
    
    let addressStr = "";
    if (typeof viewingOrder.shipping_address === 'string') {
      addressStr = viewingOrder.shipping_address;
    } else {
      addressStr = JSON.stringify(viewingOrder.shipping_address, null, 2);
    }

    setEditFormData({
      customer_name: viewingOrder.customer_name || "",
      customer_phone: viewingOrder.customer_phone || "",
      customer_email: viewingOrder.customer_email || "",
      shipping_address: addressStr || "",
      order_note: viewingOrder.order_note || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingOrder) return;
    
    setIsSubmittingEdit(true);
    try {
      let parsedAddress = editFormData.shipping_address;
      try {
        parsedAddress = JSON.parse(editFormData.shipping_address);
      } catch (err) {
        // Ignored, fallback to string
      }

      const res = await fetch(`/admin/seller-orders/${viewingOrder.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: editFormData.customer_name,
          customer_phone: editFormData.customer_phone,
          customer_email: editFormData.customer_email,
          shipping_address: parsedAddress,
          order_note: editFormData.order_note
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setViewingOrder(data.order || { ...viewingOrder, ...editFormData, shipping_address: parsedAddress });
        setIsEditDialogOpen(false);
        fetchData(currentPage); 
      } else {
        const errorData = await res.json();
        alert(`Lỗi cập nhật: ${errorData.message}`);
      }
    } catch (error) {
      alert("Đã xảy ra lỗi khi kết nối tới Server.");
      console.error(error);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const renderProductColumn = (order: any) => {
      const itemsArray = order.items || [];
      if (itemsArray.length > 0) {
        return (
          <div className="flex flex-col gap-1.5 py-1">
            {itemsArray.map((item: any, idx: number) => (
              <div key={idx} className="text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-200 flex items-center gap-1.5 w-max">
                <span className="font-bold text-blue-600 bg-blue-100 px-1 rounded">{item.quantity || 1}x</span>
                <span className="font-semibold text-gray-700">{item.type}</span>
                <span className="text-gray-400 italic">({item.color || 'N/A'} - {item.size || 'N/A'})</span>
              </div>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{order.product_type || '---'}</span>;
    };

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    // 1. Cập nhật Headers: Đã có đủ City và Số lượng
    const headers = [
      "Ngày lên đơn", "ID đơn", "Tên Shop", "Tên khách", "Address Line 1", 
      "Address Line 2", "City", "State/Region", "Country", "Zipcode", "Loại sản phẩm", 
      "Màu sản phẩm", "Size sản phẩm", "Số lượng", "Link Design Front", "Link Design Back", 
      "Link Mock-up", "Ghi chú"
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const stringified = String(str);
      return `"${stringified.replace(/"/g, '""')}"`;
    };

    const csvRows: string[] = [];
    
    data.forEach(order => {
      let addr: any = {};
      try {
        addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {});
        if (addr.raw && typeof addr.raw === 'object') addr = addr.raw;
      } catch (e) {
        addr = { line_1: order.shipping_address };
      }

      let items: any[] = [];
      try {
        if (Array.isArray(order.items) && order.items.length > 0) {
          items = order.items;
        } else if (order.product_detail) {
          const pd = typeof order.product_detail === 'string' ? JSON.parse(order.product_detail) : order.product_detail;
          if (Array.isArray(pd)) items = pd;
          else if (pd && Array.isArray(pd.items)) items = pd.items;
          else items = [pd];
        }
      } catch (e) { }

      if (items.length === 0) {
        items = [{
          type: order.product_type || "", color: "", size: "", quantity: 1, design_front: order.design_front_url || "", design_back: order.design_back_url || "", mockup: ""
        }];
      }

      let orderMockups = "";
      try {
        const mu = typeof order.mockup_urls === 'string' ? JSON.parse(order.mockup_urls) : order.mockup_urls;
        if (mu && typeof mu === 'object') {
          orderMockups = Object.values(mu).join(" | "); 
        }
      } catch (e) {}

      items.forEach(item => {
        const itemMockup = item.mockup ? item.mockup : "";
        const finalMockups = [itemMockup, orderMockups].filter(Boolean).join(" | ");

        const row = [
          escapeCSV(new Date(order.order_date).toLocaleDateString()), escapeCSV(order.external_order_id),                         
          escapeCSV(order.shop?.name || order.shop_id), escapeCSV(order.customer_name),                               
          escapeCSV(addr.line_1 || addr.address_1 || ""), escapeCSV(addr.line_2 || addr.address_2 || ""),  
          escapeCSV(addr.city || ""), // Cột City
          escapeCSV(addr.region || addr.province || addr.state || ""), escapeCSV(addr.country || addr.country_code || ""),          
          escapeCSV(addr.zip || addr.postal_code || ""), escapeCSV(item.type || order.product_type),                  
          escapeCSV(item.color || ""), escapeCSV(item.size || ""),                                  
          escapeCSV(item.quantity || 1), // <--- THÊM CỘT SỐ LƯỢNG Ở ĐÂY
          escapeCSV(item.design_front || order.design_front_url || ""), escapeCSV(item.design_back || order.design_back_url || ""),   
          escapeCSV(finalMockups), escapeCSV(order.order_note || "")                           
        ];
        csvRows.push(row.join(","));
      });
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${new Date().getTime()}.csv`);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleExport = async (mode: 'selected' | 'filtered') => {
    setIsLoading(true);
    try {
      // 1. Dùng số siêu lớn thay vì chữ "all" để Backend parse thành số nguyên thành công
      const queryParams = new URLSearchParams({ limit: "999999" });
      
      // 2. LOGIC QUAN TRỌNG: Nếu đang là mode 'selected' NHƯNG lại tích "Chọn toàn bộ (isSelectAllPages)"
      // Thì chúng ta phải ép nó xuất theo bộ lọc (filtered) để lấy sạch dữ liệu thay vì chỉ lấy ID trang hiện tại.
      const actualMode = (mode === 'selected' && isSelectAllPages) ? 'filtered' : mode;

      if (actualMode === 'selected') {
        if (selectedIds.length === 0) {
          alert("Vui lòng chọn ít nhất 1 đơn hàng để xuất CSV.");
          setIsLoading(false);
          return;
        }
        queryParams.append("order_ids", selectedIds.join(","));
      } else {
        // Chế độ 'filtered' (Xuất toàn bộ theo điều kiện lọc hiện tại)
        if (selectedShopId) queryParams.append("shop_id", selectedShopId);
        if (selectedSellerId) queryParams.append("seller_id", selectedSellerId);
        if (searchQuery) queryParams.append("search", searchQuery);
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        if (activeTab !== 'all') queryParams.append("status", activeTab); 
      }

      const res = await fetch(`/admin/seller-orders?${queryParams.toString()}`, { credentials: 'include' }).then(r => r.json());
      
      if (!res.orders || res.orders.length === 0) {
        alert("Không có đơn hàng nào khớp với bộ lọc để xuất!");
      } else {
        downloadCSV(res.orders);
      }
    } catch (error) {
      console.error("Lỗi xuất CSV:", error);
      alert("Đã xảy ra lỗi khi xuất file. Vui lòng xem console.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleTrackingUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setTrackingMessage("Đang đọc file CSV...");
    
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const mappedData = results.data.map((row: any) => ({
          external_order_id: row['Order ID'] || row['Mã Đơn'] || row['external_order_id'],
          tracking_number: row['Tracking Number'] || row['Tracking'] || row['Mã Vận Đơn'] || row['tracking_number'],
          carrier: row['Carrier'] || row['Hãng VC'] || row['shipping_carrier'] || 'USPS'
        })).filter(r => r.external_order_id && r.tracking_number); 
        
        setTrackingData(mappedData);
        setTrackingMessage(`Đã đọc xong! Có ${mappedData.length} mã vận đơn sẵn sàng đồng bộ.`);
      }
    });
    event.target.value = ''; 
  };

  const handleSyncTracking = async () => {
    if (trackingData.length === 0) return;
    setIsImportingTracking(true);
    setTrackingMessage("Đang đồng bộ dữ liệu vào hệ thống...");
    
    try {
      const response = await fetch('/admin/seller-orders/tracking/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_data: trackingData })
      });
      const data = await response.json();
      
      setTrackingMessage(data.message || "Đồng bộ thành công!");
      setTimeout(() => {
        setIsTrackingModalOpen(false);
        setTrackingData([]);
        setTrackingMessage('');
        fetchData(currentPage); 
      }, 2000);
      
    } catch (error: any) {
      setTrackingMessage(`Lỗi đồng bộ: ${error.message}`);
    } finally {
      setIsImportingTracking(false);
    }
  };

  const displayedShops = selectedSellerId 
    ? sellers.find(s => s.id === selectedSellerId)?.shops || []
    : sellers.flatMap(s => s.shops || []);
  
  const isCurrentPageFullySelected = ordersList.length > 0 && ordersList.every(o => selectedIds.includes(o.id));
  if (isLoading && ordersList.length === 0 && sellers.length === 0) {
    return <div className="p-8 text-gray-500">Đang tải dữ liệu hệ thống...</div>
  }
  
  return (
    <div className="flex flex-col gap-y-6 relative">
      <div className="flex flex-col gap-y-2 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Trung tâm điều hành POD</h1>
          <p className="text-gray-500">Quản lý đối tác và phê duyệt đơn hàng trước khi sản xuất.</p>
        </div>
        
        <Button 
          variant="secondary" 
          className="bg-gray-900 text-white hover:bg-gray-800 shadow-md h-10 px-4"
          onClick={() => setIsTrackingModalOpen(true)}
        >
          <ArrowUpTray /> Import Tracking (CSV)
        </Button>
      </div>
      
      {/* THANH BỘ LỌC */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Lọc theo Seller</label>
          <select 
            value={selectedSellerId} 
            onChange={(e) => {
              setSelectedSellerId(e.target.value); 
              setSelectedShopId(''); 
              setCurrentPage(1);
            }}
            className="border p-2 rounded text-sm min-w-[150px] outline-none focus:border-blue-500"
          >
            <option value="">Tất cả Seller</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col gap-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Lọc theo Shop</label>
          <select 
            value={selectedShopId} 
            onChange={(e) => {setSelectedShopId(e.target.value); setCurrentPage(1);}}
            disabled={!selectedSellerId && displayedShops.length === 0}
            className="border p-2 rounded text-sm min-w-[150px] outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Tất cả Shop {selectedSellerId ? 'của Seller này' : ''}</option>
            {displayedShops.map((shop: any) => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Mã đơn hàng (ID)</label>
          <input 
            type="text" 
            placeholder="Tìm mã đơn..." 
            value={searchQuery}
            onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
            className="border p-2 rounded text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => {setStartDate(e.target.value); setCurrentPage(1);}}
            className="border p-2 rounded text-sm text-gray-600"
          />
        </div>

        <div className="flex flex-col gap-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => {setEndDate(e.target.value); setCurrentPage(1);}}
            className="border p-2 rounded text-sm text-gray-600"
          />
        </div>

        <button 
          onClick={handleReset}
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-200 transition"
        >
          Làm mới
        </button>
        <Button variant="secondary" onClick={() => handleExport('filtered')}>
            <ArrowDownTray /> Xuất CSV (Kết quả lọc)
        </Button>
      </div>

      {/* THANH BULK ACTION */}
      {(selectedIds.length > 0 || isSelectAllPages) && (
        <div className={clx("bg-gray-900 text-white p-4 rounded-lg flex items-center justify-between shadow-lg sticky top-4 transition-all", isReshipModalOpen || isTrackingModalOpen || viewingOrder ? "z-0" : "z-30")}>
          <div className="flex items-center gap-x-4">
            <span className="font-bold bg-blue-500 px-2 py-1 rounded text-xs">
              {isSelectAllPages ? totalCount : selectedIds.length} đơn đã chọn
            </span>
          </div>
          <div className="flex gap-x-2 items-center">
            {activeTab === 'processing' && (
              <Button variant="secondary" size="small" className="bg-orange-600 border-none text-white hover:bg-orange-700" 
                onClick={() => handlePushStatus('in_transit')} isLoading={isBulking}>
                <CheckCircleSolid /> Cập nhật thành: Đang giao (In Transit)
              </Button>
            )}

            {activeTab === 'in_transit' && (
              <Button variant="secondary" size="small" className="bg-green-600 border-none text-white hover:bg-green-700" 
                onClick={() => handlePushStatus('done')} isLoading={isBulking}>
                <CheckCircleSolid /> Cập nhật thành: Đã giao (Done)
              </Button>
            )}
            
            {activeTab === 'complete' && (
              <>
                <Button variant="secondary" size="small" className="bg-green-600 border-none text-white hover:bg-green-700" 
                  onClick={() => handleBulkAction('approve')} isLoading={isBulking}>
                  <CheckCircleSolid /> Duyệt hàng loạt
                </Button>
                <Button variant="secondary" size="small" className="bg-red-600 border-none text-white hover:bg-red-700"
                  onClick={() => handleBulkAction('reject')} isLoading={isBulking}>
                  <Trash /> Hủy hàng loạt
                </Button>
              </>
            )}
            
            {activeTab === 'support' && (
              <>
                <Button variant="secondary" size="small" className="bg-green-600 border-none text-white hover:bg-green-700" 
                  onClick={() => setIsReshipModalOpen(true)} isLoading={isBulking}>
                  <CheckCircleSolid /> Duyệt đi lại đơn (Reship)
                </Button>
                <Button variant="secondary" size="small" className="bg-red-600 border-none text-white hover:bg-red-700" 
                  onClick={() => handleBulkAction('reject')} isLoading={isBulking}>
                  <XCircleSolid /> Hủy yêu cầu hỗ trợ
                </Button>
              </>
            )}

            {activeTab === 'processing' && (
              <Button variant="secondary" size="small" className="bg-orange-600 border-none text-white hover:bg-orange-700" 
                onClick={() => handleBulkAction('unapprove')} isLoading={isBulking}>
                <XCircleSolid /> Hủy Duyệt (về Chờ duyệt)
              </Button>
            )}

            {activeTab === 'cancelled' && (
              <Button variant="secondary" size="small" className="bg-blue-600 border-none text-white hover:bg-blue-700" 
                onClick={() => handleBulkAction('restore')} isLoading={isBulking}>
                <ArrowUturnLeft /> Khôi phục đơn chọn
              </Button>
            )}

            <Button variant="secondary" size="small" className="bg-red-600 border-none text-white hover:bg-red-700"
              onClick={() => handleBulkAction('delete')} isLoading={isBulking}>
              <Trash /> Xóa vĩnh viễn
            </Button>
            
            <Button variant="secondary" size="small" className="bg-blue-600 border-none text-white hover:bg-blue-700"
              onClick={() => handleExport('selected')}>
              <ArrowDownTray /> Tải CSV
            </Button>
            <Button variant="secondary" size="small" className="bg-teal-600 border-none text-white hover:bg-teal-700" 
              onClick={() => setIsPrinterModalOpen(true)}>
              Phân bổ Nhà In
            </Button>
            <Button variant="transparent" size="small" className="text-gray-400 ml-2" onClick={() => setSelectedIds([])}>
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CỘT 1: QUẢN LÝ SELLER */}
        <div className="xl:col-span-1 flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-800 uppercase text-sm tracking-wider">Danh sách Seller - Newest</h2>
          {sellers.map(seller => {
            const displayName = seller.name || 
              [seller.last_name, seller.first_name].filter(Boolean).join(" ") || 
              'Chưa đặt tên';

            return (
              <div key={seller.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">{displayName}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                    {seller.shops?.length || 0} Shops
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 mb-4 text-xs bg-gray-50 p-2 rounded border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Phí in thêm (Markup): <strong className="text-green-600">+${seller.markup_fee || 0}</strong></span>
                    <button onClick={() => handleUpdateMarkup(seller.id, seller.markup_fee || 0)} className="text-blue-600 font-semibold hover:underline">Sửa phí</button>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="text-gray-600">Phí xử lý đơn (Per Order): <strong className="text-orange-600">+${seller.per_order_fee || 0}/đơn</strong></span>
                    <button onClick={() => handleUpdatePerOrderFee(seller.id, seller.per_order_fee || 0)} className="text-blue-600 font-semibold hover:underline">Sửa phí</button>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                    <span className="text-gray-600 flex flex-col">
                      <span>Ưu đãi (Hiển thị): <strong className="text-purple-600">{seller.special_discount || "0%"}</strong></span>
                      <span className="text-[10px] text-gray-400 italic">({seller.discount_note || "Hạng thành viên tiêu chuẩn"})</span>
                    </span>
                    <button onClick={() => handleUpdateDiscount(seller.id, seller.special_discount, seller.discount_note)} className="text-blue-600 font-semibold hover:underline">Sửa ưu đãi</button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {seller.shops?.length > 0 ? seller.shops.map((shop: any) => {
                    const isActive = shop.is_active !== false;
                    return (
                      <div key={shop.id} className="flex flex-col text-sm p-3 bg-white rounded-md border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-700 font-medium truncate pr-2">🏪 {shop.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isActive ? 'Hoạt động' : 'Đã Khóa'}
                          </span>
                        </div>
                        
                        <div className="flex justify-end gap-3 text-xs border-t border-gray-100 pt-2">
                          <button 
                            onClick={() => handleAdminToggleShop(shop)} 
                            className="text-gray-500 hover:text-gray-900 font-semibold transition"
                          >
                            {isActive ? 'Khóa' : 'Mở khóa'}
                          </button>
                          <button 
                            onClick={() => handleAdminDeleteShop(shop.id)} 
                            className="text-red-400 hover:text-red-600 font-semibold transition"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-xs text-gray-400 italic text-center py-2">Chưa có cửa hàng nào.</div>
                  )}
                </div>
              </div>
            );
          })}
          {sellers.length === 0 && <div className="text-sm text-gray-500">Chưa có Seller nào trong hệ thống.</div>}
        </div>

        {/* CỘT 2: BẢNG DANH SÁCH ĐƠN HÀNG */}
        <div className="xl:col-span-2 flex flex-col gap-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => {
                setActiveTab('complete'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'complete' ? "bg-gray-900 text-white" : "bg-white border text-gray-600 hover:bg-gray-50")}>
                Đơn chờ duyệt
              </button>
              <button onClick={() => {
                setActiveTab('processing'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'processing' ? "bg-blue-100 text-blue-800" : "bg-white border text-gray-600 hover:bg-gray-50")}>
                Đang sản xuất
              </button>
              <button onClick={() => {
                setActiveTab('in_transit'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'in_transit' ? "bg-orange-100 text-orange-800" : "bg-white border text-gray-600 hover:bg-gray-50")}>
                Đang giao hàng
              </button>
              <button onClick={() => {
                setActiveTab('done'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'done' ? "bg-green-100 text-green-800" : "bg-white border text-gray-600 hover:bg-gray-50")}>
                Hoàn thành
              </button>
              <button onClick={() => {
                setActiveTab('support'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 text-xs font-bold rounded-lg border", activeTab === 'support' ? "bg-red-600 border-red-600 text-white shadow-md" : "bg-white border-red-200 text-red-600 hover:bg-red-50")}>
                Yêu cầu Hỗ trợ
              </button>
              <button onClick={() => {
                setActiveTab('reship'); setCurrentPage(1); setSelectedIds([]); setIsSelectAllPages(false);
              }} className={clx("px-4 py-2 text-xs font-bold rounded-lg border", activeTab === 'reship' ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-white border-purple-200 text-purple-600 hover:bg-purple-50")}>
                Đơn Reship (RS)
              </button>
              <button onClick={() => {setActiveTab('all'); setCurrentPage(1)}} className={clx("px-4 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'all' ? "bg-gray-200 text-gray-900" : "bg-white border text-gray-600 hover:bg-gray-50")}>
                Tất cả đơn
              </button>
            </div>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
              {totalCount} Đơn hàng
            </span>
          </div>

          {selectedIds.length === ordersList.length && ordersList.length > 0 && !isSelectAllPages && totalCount > ordersList.length && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between text-sm">
              <span>Bạn đã chọn tất cả <b>{ordersList.length}</b> đơn hàng trên trang này.</span>
              <button 
                onClick={() => setIsSelectAllPages(true)}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Chọn toàn bộ {totalCount} đơn hàng trong mục này
              </button>
            </div>
          )}

          {isSelectAllPages && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center justify-between text-sm">
              <span>Đã chọn toàn bộ <b>{totalCount}</b> đơn hàng trong mục này.</span>
              <button 
                onClick={() => { setSelectedIds([]); setIsSelectAllPages(false); }}
                className="font-bold text-green-700 hover:text-green-900 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      // ĐÃ SỬA: Sẽ hiển thị đúng trạng thái chọn của trang hiện tại hoặc toàn bộ
                      checked={isSelectAllPages || isCurrentPageFullySelected} 
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Mã Đơn / Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Shop & Khách</th>
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-3 font-semibold text-center">Thiết kế</th>
                  <th className="px-4 py-3 font-semibold">Nhà In</th>
                  <th className="px-4 py-3 font-semibold">Tracking</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordersList.map(order => {
                  const isActioning = actioningIds.includes(order.id);
                  // Biến kiểm tra xem dòng này có đang được chọn hay không
                  const isRowSelected = isSelectAllPages || selectedIds.includes(order.id);

                  return (
                    // Cập nhật đổi màu nền (bg-blue) dựa trên isRowSelected
                    <tr key={order.id} className={clx("hover:bg-gray-50 cursor-pointer transition-colors", isRowSelected && "bg-blue-50/50")} onClick={() => toggleSelect(order.id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {/* Cập nhật dấu tích checked dựa trên isRowSelected */}
                        <input type="checkbox" checked={isRowSelected} onChange={() => toggleSelect(order.id)} className="cursor-pointer accent-blue-600"/>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{order.external_order_id}</div>
                        {order.order_type === 'reshipment' && (
                          <Badge size="small" color="purple" className="mr-1">Reship</Badge>
                        )}
                        <Badge size="small" color={
                          order.status === 'pending' ? 'grey' : 
                          order.status === 'complete' ? 'orange' : 
                          order.status === 'processing' ? 'blue' : 
                          order.status === 'cancelled' ? 'red' : 
                          order.status === 'support' ? 'red' : 'green'
                        }>
                          {order.status === 'complete' ? 'paid' : order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="font-medium text-gray-900">Shop: {order.shop?.name || order.shop_id}</div>
                        <div>Khách: {order.customer_name}</div>
                      </td>
                      <td className="px-4 py-3">{renderProductColumn(order)}</td>
                      {/* CỘT HIỂN THỊ DESIGN (INLINE) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 justify-center max-w-[120px]">
                          {order.items?.length > 0 ? (
                            order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex gap-1">
                                {item.design_front && (
                                  <a href={item.design_front} target="_blank" rel="noreferrer" title="Mặt trước">
                                    <img src={item.design_front} className="w-8 h-8 rounded border border-gray-300 object-cover hover:scale-150 transition-transform" />
                                  </a>
                                )}
                                {item.design_back && (
                                  <a href={item.design_back} target="_blank" rel="noreferrer" title="Mặt sau">
                                    <img src={item.design_back} className="w-8 h-8 rounded border border-gray-300 object-cover hover:scale-150 transition-transform" />
                                  </a>
                                )}
                              </div>
                            ))
                          ) : (
                            /* Fallback cho đơn cũ không có items mảng */
                            <div className="flex gap-1">
                              {order.design_front_url && (
                                <a href={order.design_front_url} target="_blank" rel="noreferrer">
                                  <img src={order.design_front_url} className="w-8 h-8 rounded border border-gray-300 object-cover hover:scale-150 transition-transform" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CỘT NHẬP NHÀ IN (INLINE EDIT) */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center">
                          <input 
                            type="text"
                            defaultValue={order.printer_name || ""}
                            placeholder="Tên nhà in..."
                            className={clx(
                              "border p-1.5 w-24 text-xs rounded outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                              updatingPrinterIds.includes(order.id) ? "bg-gray-100 text-gray-400" : "bg-white"
                            )}
                            onBlur={(e) => {
                              const newVal = e.target.value.trim();
                              if (newVal !== (order.printer_name || "")) {
                                handleUpdatePrinter([order.id], newVal);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur(); // Nhấn Enter tự động unfocus để lưu
                              }
                            }}
                            disabled={updatingPrinterIds.includes(order.id)}
                          />
                          {updatingPrinterIds.includes(order.id) && (
                            <Spinner className="w-3 h-3 absolute right-2 text-blue-600 animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {order.tracking_number ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-orange-600">{order.tracking_number}</span>
                            <span className="text-gray-400">{order.shipping_carrier || 'USPS'}</span>
                          </div>
                        ) : <span className="text-gray-400 italic">Chưa có</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(order.id)} className="text-blue-600 font-semibold hover:underline mr-2">Chi tiết</button>
                        {order.status === 'complete' && (
                          <>
                            <button onClick={() => executeOrderAction(order.id, 'approve')} disabled={isActioning} className={clx("px-3 py-1.5 rounded text-xs font-semibold transition", isActioning ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800")}>
                              {isActioning ? <Spinner className="animate-spin inline mr-1"/> : 'Duyệt'}
                            </button>
                            <button onClick={() => executeOrderAction(order.id, 'reject')} disabled={isActioning} className={clx("border px-3 py-1.5 rounded text-xs font-semibold transition", isActioning ? "text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white border-gray-300 text-red-600 hover:bg-red-50")}>Hủy</button>
                          </>
                        )}
                        {order.status === 'processing' && (
                          <button onClick={() => executeOrderAction(order.id, 'unapprove')} disabled={isActioning} className="border border-orange-300 text-orange-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-orange-50">{isActioning ? <Spinner className="animate-spin inline mr-1"/> : 'Hủy Duyệt'}</button>
                        )}
                        {order.status === 'cancelled' && (
                          <button onClick={() => executeOrderAction(order.id, 'restore')} disabled={isActioning} className="border border-blue-300 text-blue-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-50">{isActioning ? <Spinner className="animate-spin inline mr-1"/> : 'Khôi phục'}</button>
                        )}
                        {order.status === 'support' && (
                          <button 
                            onClick={() => executeOrderAction(order.id, 'reject')} 
                            disabled={isActioning} 
                            className={clx("border px-3 py-1.5 rounded text-xs font-semibold transition", isActioning ? "text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white border-gray-300 text-red-600 hover:bg-red-50")}
                          >
                            Hủy đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500 font-medium">
                Đang hiện <span className="font-bold text-gray-900">{ordersList.length}</span> trên tổng số <span className="font-bold text-gray-900">{totalCount}</span> đơn
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition">← Trước</button>
                <div className="px-4 py-2 bg-gray-50 border rounded-md text-sm font-semibold text-gray-700">Trang {currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition">Sau →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* POPUP DUYỆT ĐI LẠI ĐƠN (RESHIP) */}
      {/* ================================================= */}
      {isReshipModalOpen && (
        <FocusModal open={isReshipModalOpen} onOpenChange={setIsReshipModalOpen}>
          {/* fix cho Radix UI */}
          <FocusModal.Content aria-describedby="reship-desc">
            <span id="reship-desc" className="sr-only">Popup thao tác duyệt lại đơn reship</span>
            
            <FocusModal.Header>
              <Heading>Cấu hình & Duyệt đi lại đơn (Reship)</Heading>
            </FocusModal.Header>
            <FocusModal.Body className="p-8 bg-gray-50 flex flex-col items-center">
              <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-y-6">
                
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-200 font-medium">
                  Bạn đang thao tác đi lại <strong>{selectedIds.length}</strong> đơn hàng. Hệ thống sẽ tự động tạo đơn mới với tiền tố <strong>RS-</strong> và đẩy thẳng vào trạng thái Đang Sản Xuất (Processing).
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">1. Ai chịu chi phí cho các đơn đi lại này?</label>
                  <select 
                    value={reshipPolicy} 
                    onChange={(e: any) => setReshipPolicy(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="free">Miễn phí 100% (Xưởng chịu lỗi, Base Cost = 0)</option>
                    <option value="half">Chia sẻ rủi ro (Giảm 50% chi phí sản xuất)</option>
                    <option value="full">Seller chịu phí 100% (Tính phí như đơn bình thường)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">2. Lý do / Ghi chú (Sẽ hiển thị cho Seller thấy)</label>
                  <textarea 
                    rows={3}
                    value={reshipReason} 
                    onChange={(e) => setReshipReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 text-sm"
                    placeholder="Ví dụ: Xưởng hỗ trợ in lại do lỗi lem màu..."
                  />
                </div>

                <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-gray-100">
                  <Button variant="transparent" onClick={() => setIsReshipModalOpen(false)}>Hủy bỏ</Button>
                  <Button variant="secondary" className="bg-green-600 text-white hover:bg-green-700 font-bold px-6" onClick={handleBulkReship} isLoading={isSubmittingReship}>
                    Xác nhận tạo đơn Reship
                  </Button>
                </div>

              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}

      {/* ================================================= */}
      {/* POPUP IMPORT TRACKING CSV */}
      {/* ================================================= */}
      {isTrackingModalOpen && (
        <FocusModal open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
          {/* fix cho Radix UI */}
          <FocusModal.Content aria-describedby="tracking-desc">
            <span id="tracking-desc" className="sr-only">Popup tải file mã vận đơn Tracking</span>

            <FocusModal.Header>
              <div className="flex items-center gap-x-4">
                <Heading>Đồng bộ Mã Vận Đơn từ Xưởng (Import Tracking)</Heading>
              </div>
            </FocusModal.Header>
            <FocusModal.Body className="p-8 bg-gray-50 flex flex-col items-center">
              
              <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-y-6">
                <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                  <ArrowUpTray className="text-blue-500 w-10 h-10 mb-4" />
                  <Heading level="h2" className="text-gray-800 mb-2">Tải lên file Tracking (CSV)</Heading>
                  <Text className="text-gray-500 mb-6 text-sm">
                    File cần chứa các cột: <strong>Order ID, Tracking Number, Carrier</strong>. <br />
                    Các đơn hàng khớp ID sẽ tự động chuyển sang trạng thái "Đang giao hàng" (In Transit).
                  </Text>
                  <label className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-blue-700 transition shadow-md">
                    Chọn File CSV trên máy tính
                    <input type="file" accept=".csv" className="hidden" onChange={handleTrackingUpload} />
                  </label>
                </div>

                {trackingMessage && (
                  <div className={clx("p-4 rounded-lg text-sm font-semibold border", trackingMessage.includes("Lỗi") ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-700 border-green-200")}>
                    {trackingMessage}
                  </div>
                )}

                {trackingData.length > 0 && (
                  <div className="flex flex-col gap-y-4">
                    <div className="flex justify-between items-center">
                      <Heading level="h3" className="text-base text-gray-800">Xem trước dữ liệu ({trackingData.length} đơn)</Heading>
                      <Button onClick={handleSyncTracking} isLoading={isImportingTracking} className="bg-gray-900 text-white hover:bg-gray-800">
                        Bắt đầu Đồng Bộ Tracking
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                          <tr>
                            <th className="p-3 font-semibold">Mã Đơn (Order ID)</th>
                            <th className="p-3 font-semibold">Mã Vận Đơn (Tracking)</th>
                            <th className="p-3 font-semibold">Hãng VC (Carrier)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {trackingData.slice(0, 100).map((row, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="p-3 font-bold text-gray-900">{row.external_order_id}</td>
                              <td className="p-3 text-orange-600 font-medium">{row.tracking_number}</td>
                              <td className="p-3 text-gray-500">{row.carrier}</td>
                            </tr>
                          ))}
                          {trackingData.length > 100 && (
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="p-3 text-center text-gray-500 italic">... và {trackingData.length - 100} dòng khác</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}

      {/* ================================================= */}
      {/* MODAL CHI TIẾT ĐƠN HÀNG (CÓ BANNER EDIT MỚI TRONG BODY) */}
      {/* ================================================= */}
      {viewingOrder && (
        <FocusModal open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
          {/* fix cho Radix UI */}
          <FocusModal.Content aria-describedby="detail-desc">
            <span id="detail-desc" className="sr-only">Hiển thị thông tin chi tiết đơn hàng</span>
            
            {/* Header trả về mặc định, bỏ các nút can thiệp CSS của Medusa */}
            <FocusModal.Header>
              <div className="flex items-center gap-x-4">
                <Heading>Chi tiết đơn hàng: {viewingOrder.external_order_id}</Heading>
                <Badge color={viewingOrder.status === 'pending' ? 'orange' : viewingOrder.status === 'processing' ? 'blue' : viewingOrder.status === 'cancelled' ? 'red' : 'green'}>
                  {viewingOrder.status}
                </Badge>
              </div>
            </FocusModal.Header>
            
            <FocusModal.Body className="p-8 bg-gray-50 overflow-y-auto max-h-[calc(100vh-120px)]">
              
              {/* KHỐI BANNER CHỈNH SỬA (Đưa vào Body để chắc chắn hiển thị 100%) */}
              {['pending', 'processing', 'complete'].includes(viewingOrder.status) && (
                <div className="max-w-5xl mx-auto mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="font-bold text-blue-900 text-base">Cập nhật thông tin đơn hàng</h3>
                    <p className="text-sm text-blue-700">Chỉnh sửa địa chỉ giao hàng, số điện thoại, tên khách và ghi chú.</p>
                  </div>
                  <Button variant="secondary" className="bg-blue-600 border-none text-white hover:bg-blue-700 shadow-md px-6" onClick={handleOpenEditDrawer}>
                    Mở Form Chỉnh Sửa
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
                <Container className="p-6 bg-white shadow-sm border border-gray-100">
                  <Heading level="h2" className="mb-4 text-gray-400 text-xs uppercase tracking-widest border-b pb-2">Thông tin khách hàng</Heading>
                  <div className="space-y-3">
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-20 inline-block">Họ tên:</span> {viewingOrder.customer_name}</Text>
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-20 inline-block">Email:</span> {viewingOrder.customer_email || "---"}</Text>
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-20 inline-block">SĐT:</span> {viewingOrder.customer_phone || "---"}</Text>
                  </div>
                </Container>
                
                <Container className="p-6 bg-white shadow-sm border border-gray-100">
                  <Heading level="h2" className="mb-4 text-gray-400 text-xs uppercase tracking-widest border-b pb-2">Thông tin Đơn & Shop</Heading>
                  <div className="space-y-3">
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-24 inline-block">Shop:</span> {viewingOrder.shop?.name || viewingOrder.shop_id}</Text>
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-24 inline-block">Giá trị:</span> <span className="text-green-600 font-bold">${viewingOrder.order_price}</span></Text>
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-24 inline-block">Ngày tạo:</span> {new Date(viewingOrder.order_date).toLocaleString()}</Text>
                    <Text className="text-sm"><span className="font-semibold text-gray-700 w-24 inline-block">Tracking:</span> {viewingOrder.tracking_number || "Chưa có"}</Text>
                  </div>
                </Container>

                <Container className="p-6 col-span-2 bg-white shadow-sm border border-gray-100">
                  <Heading level="h2" className="mb-4 text-gray-400 text-xs uppercase tracking-widest border-b pb-2">Danh sách sản phẩm chi tiết</Heading>
                  <div className="grid grid-cols-1 gap-3">
                    {viewingOrder.items && viewingOrder.items.length > 0 ? (
                      viewingOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                              {item.quantity || 1}
                            </div>
                            <div>
                              <Text className="font-bold text-gray-900">{item.type}</Text>
                              <div className="flex gap-3 mt-1">
                                <Badge size="small" className="bg-white border text-gray-600">Màu: {item.color || 'N/A'}</Badge>
                                <Badge size="small" className="bg-white border text-gray-600">Size: {item.size || 'N/A'}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col gap-1">
                             {item.design_front && <a href={item.design_front} target="_blank" className="text-[10px] text-blue-600 hover:underline">Link Design Front</a>}
                             {item.design_back && <a href={item.design_back} target="_blank" className="text-[10px] text-blue-600 hover:underline">Link Design Back</a>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-gray-400 italic text-sm">
                        Đơn hàng cũ không có dữ liệu chi tiết (Loại: {viewingOrder.product_type})
                      </div>
                    )}
                  </div>
                </Container>

                <Container className="p-6 col-span-2 bg-white shadow-sm border border-gray-100">
                  <Heading level="h2" className="mb-4 text-gray-400 text-xs uppercase tracking-widest border-b pb-2">Địa chỉ giao hàng</Heading>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm border border-gray-100">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                      {typeof viewingOrder.shipping_address === 'string' 
                        ? viewingOrder.shipping_address 
                        : JSON.stringify(viewingOrder.shipping_address, null, 2).replace(/[{}"]/g, '').trim()}
                    </pre>
                  </div>
                </Container>
                
                {viewingOrder.order_note && (
                  <Container className="p-6 col-span-2 bg-white shadow-sm border border-gray-100">
                    <Heading level="h2" className="mb-4 text-gray-400 text-xs uppercase tracking-widest border-b pb-2">
                      {viewingOrder.order_note.includes("Minh chứng:") ? "⚠️ Yêu cầu Hỗ trợ / Khiếu nại" : "Ghi chú đơn hàng"}
                    </Heading>
                    
                    {(() => {
                      const noteStr = viewingOrder.order_note;
                      if (noteStr.includes("Minh chứng:")) {
                        const parts = noteStr.split("Minh chứng:");
                        const reason = parts[0].trim();
                        const proof = parts[1]?.trim();
                        
                        return (
                          <div className="flex flex-col md:flex-row gap-6 bg-red-50/80 p-5 rounded-xl border border-red-100">
                            <div className="flex-1 space-y-2">
                              <Text className="text-sm font-black text-red-800 uppercase tracking-wide">Chi tiết yêu cầu:</Text>
                              <Text className="text-sm text-red-700 leading-relaxed font-medium">{reason}</Text>
                            </div>
                            
                            {proof && proof !== "https://placehold.co/150?text=No+Image" && (
                              <div className="w-full md:w-1/3 shrink-0">
                                <Text className="text-sm font-black text-red-800 uppercase tracking-wide mb-2">Ảnh minh chứng:</Text>
                                <a href={proof} target="_blank" rel="noreferrer" className="block border border-red-200 rounded-lg overflow-hidden hover:opacity-80 transition shadow-sm bg-white p-1">
                                  <img src={proof} alt="Minh chứng hỗ trợ" className="w-full h-auto max-h-48 object-cover rounded-md" />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Text className="text-sm text-gray-700 italic bg-yellow-50 p-3 rounded border border-yellow-100">
                          {noteStr}
                        </Text>
                      );
                    })()}
                  </Container>
                )}
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}

      {/* ================================================= */}
      {/* ✏️ DRAWER CHỈNH SỬA ĐƠN HÀNG LỚP Z-INDEX CAO NHẤT */}
      {/* ================================================= */}
      {isEditDialogOpen && viewingOrder && (
        <Drawer open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          {/* fix cho Radix UI */}
          <Drawer.Content aria-describedby="drawer-desc" className="z-[9999] border-l border-gray-200 shadow-2xl">
            <Drawer.Header>
              <Drawer.Title>Chỉnh sửa ID: {viewingOrder.external_order_id}</Drawer.Title>
              {/* Thẻ Description ẩn bắt buộc cho a11y */}
              <Drawer.Description id="drawer-desc" className="sr-only">
                Form cập nhật dữ liệu của khách hàng
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className="p-6 overflow-y-auto">
              <form id="edit-order-form" onSubmit={handleEditSubmit} className="space-y-5">
                
                <div className="flex flex-col gap-y-2">
                  <Label className="text-gray-700 font-semibold">Tên khách hàng (*)</Label>
                  <Input 
                    value={editFormData.customer_name}
                    onChange={e => setEditFormData({...editFormData, customer_name: e.target.value})}
                    required
                  />
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label className="text-gray-700 font-semibold">Số điện thoại</Label>
                  <Input 
                    value={editFormData.customer_phone}
                    onChange={e => setEditFormData({...editFormData, customer_phone: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label className="text-gray-700 font-semibold">Email</Label>
                  <Input 
                    type="email"
                    value={editFormData.customer_email}
                    onChange={e => setEditFormData({...editFormData, customer_email: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label className="text-gray-700 font-semibold">Địa chỉ giao hàng (Raw/JSON)</Label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 min-h-[200px] font-mono text-gray-700 bg-gray-50"
                    value={editFormData.shipping_address}
                    onChange={e => setEditFormData({...editFormData, shipping_address: e.target.value})}
                  />
                  <span className="text-[10px] text-gray-400">Có thể nhập chuỗi chữ hoặc định dạng JSON.</span>
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label className="text-gray-700 font-semibold">Ghi chú (Note)</Label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 min-h-[100px]"
                    value={editFormData.order_note}
                    onChange={e => setEditFormData({...editFormData, order_note: e.target.value})}
                  />
                </div>

              </form>
            </Drawer.Body>
            <Drawer.Footer className="border-t border-gray-100 p-4 bg-gray-50">
              <Drawer.Close asChild>
                <Button variant="secondary">Hủy bỏ</Button>
              </Drawer.Close>
              <Button form="edit-order-form" type="submit" variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700" isLoading={isSubmittingEdit}>
                Lưu thay đổi
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
          {/* ================================================= */}
          {/* POPUP PHÂN BỔ NHÀ IN HÀNG LOẠT */}
          {/* ================================================= */}
          {isPrinterModalOpen && (
            <FocusModal open={isPrinterModalOpen} onOpenChange={setIsPrinterModalOpen}>
              <FocusModal.Content aria-describedby="printer-desc">
                <span id="printer-desc" className="sr-only">Nhập tên nhà in để cập nhật hàng loạt</span>
                <FocusModal.Header>
                  <Heading>Phân bổ Nhà In ({selectedIds.length} đơn)</Heading>
                </FocusModal.Header>
                <FocusModal.Body className="p-8 bg-gray-50 flex flex-col items-center">
                  <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-y-4">
                    <label className="text-sm font-bold text-gray-700">Nhập tên Nhà In cho các đơn đã chọn:</label>
                    <input 
                      type="text"
                      value={bulkPrinterName}
                      onChange={(e) => setBulkPrinterName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                      placeholder="Ví dụ: Xưởng A, Printify, SwiftPOD..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="transparent" onClick={() => setIsPrinterModalOpen(false)}>Hủy</Button>
                      <Button 
                        variant="secondary" 
                        className="bg-teal-600 text-white hover:bg-teal-700 font-bold"
                        isLoading={updatingPrinterIds.length > 0}
                        onClick={() => handleUpdatePrinter(selectedIds, bulkPrinterName)}
                        disabled={!bulkPrinterName.trim()}
                      >
                        Lưu phân bổ
                      </Button>
                    </div>
                  </div>
                </FocusModal.Body>
              </FocusModal.Content>
            </FocusModal>
          )}
        </Drawer>
      )}

    </div>
  )
}

// teementpod/src/admin/routes/finance/page.tsx
import { useEffect, useState } from "react";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CurrencyDollar, Plus, Trash } from "@medusajs/icons";
import { Container, Heading, Text, Table, Button, Badge, clx } from "@medusajs/ui";

export const config = defineRouteConfig({
  label: "Tài chính & Công nợ",
  icon: CurrencyDollar,
});

export default function FinanceAdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [sellersFinance, setSellersFinance] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal Gạch nợ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number | string>("");
  const [billingCycle, setBillingCycle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mảng lưu ID các Seller đang được mở rộng chi tiết Shop
  const [expandedSellers, setExpandedSellers] = useState<string[]>([]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/finance");
      const data = await res.json();
      if (data.sellers_finance) setSellersFinance(data.sellers_finance);
      if (data.recent_payments) setRecentPayments(data.recent_payments);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu tài chính", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinanceData(); }, []);

  const toggleSellerExpand = (sellerId: string) => {
    setExpandedSellers(prev => 
      prev.includes(sellerId) ? prev.filter(id => id !== sellerId) : [...prev, sellerId]
    );
  };

  const openPaymentModal = (shop: any) => {
    setSelectedShop(shop);
    setPayAmount(shop.current_debt > 0 ? shop.current_debt : "");
    const now = new Date();
    setBillingCycle(`Tháng ${now.getMonth() + 1}/${now.getFullYear()}`);
    setIsModalOpen(true);
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !payAmount) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: selectedShop.shop_id,
          amount: Number(payAmount),
          billing_cycle: billingCycle,
          total_successful_orders: selectedShop.successful_orders_count,
          note: "Admin ghi nhận thanh toán thủ công"
        })
      });

      if (res.ok) {
        alert(`Đã gạch nợ thành công $${payAmount} cho cửa hàng ${selectedShop.shop_name}`);
        setIsModalOpen(false);
        fetchFinanceData(); 
      } else {
        alert("Có lỗi xảy ra khi ghi nhận thanh toán.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <Heading level="h1">Hệ thống Sổ cái & Quản lý Công nợ</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Theo dõi chi phí sản xuất tích lũy và duyệt gạch nợ minh bạch theo từng đối tác Seller và Shop vệ tinh.
        </Text>
      </div>

      {/* Điều hướng Tabs điều hành */}
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 flex gap-1 w-max">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={clx("px-6 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'overview' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
        >
          Phân rã theo Seller & Shop
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={clx("px-6 py-2 rounded-lg text-sm font-semibold transition", activeTab === 'history' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
        >
          Lịch sử duyệt gạch nợ toàn cục
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 animate-pulse">Đang đồng bộ sổ cái hệ thống...</div>
      ) : activeTab === 'overview' ? (
        /* TAB 1: PHÂN RÃ THEO SELLER -> SHOP */
        <div className="space-y-4">
          {sellersFinance.length === 0 ? (
            <Container className="p-8 text-center text-gray-500 italic">Hệ thống chưa có dữ liệu tài chính.</Container>
          ) : (
            sellersFinance.map((seller) => {
              const isExpanded = expandedSellers.includes(seller.seller_id);
              return (
                <Container key={seller.seller_id} className="p-0 overflow-hidden border border-gray-200 shadow-sm rounded-xl bg-white">
                  {/* Thanh tổng quan thông tin cốt lõi của Seller */}
                  <div 
                    onClick={() => toggleSellerExpand(seller.seller_id)}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-sm shadow-sm">
                        {seller.seller_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Heading level="h2" className="text-base text-gray-900 font-bold">{seller.seller_name}</Heading>
                        <Text className="text-xs text-gray-400 font-medium">Sở hữu {seller.shops?.length || 0} cửa hàng · {seller.orders_count} đơn hàng</Text>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-6 text-sm">
                      <div className="text-right">
                        <span className="text-[10px] block font-bold text-gray-400 uppercase">Doanh thu phôi</span>
                        <span className="font-semibold text-gray-700">${seller.total_debt.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] block font-bold text-gray-400 uppercase">Đã thanh toán</span>
                        <span className="font-semibold text-green-600">${seller.total_paid.toFixed(2)}</span>
                      </div>
                      <div className="text-right pr-2">
                        <span className="text-[10px] block font-bold text-gray-400 uppercase">Dư nợ</span>
                        {seller.current_debt > 0 ? (
                          <Badge color="red" size="small" className="font-bold">${seller.current_debt.toFixed(2)}</Badge>
                        ) : (
                          <Badge color="green" size="small" className="font-bold">Đủ</Badge>
                        )}
                      </div>
                      <span className="text-gray-300 font-light text-xl">|</span>
                      <span className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1">
                        {isExpanded ? "Thu gọn ▲" : "Xem chi tiết vệ tinh ▼"}
                      </span>
                    </div>
                  </div>

                  {/* Ma trận hiển thị danh sách các Shop thuộc Seller đó */}
                  {isExpanded && (
                    <div className="bg-gray-50/50 p-4 border-t border-gray-100 animate-in fade-in duration-200">
                      <Table>
                        <Table.Header>
                          <Table.Row className="bg-gray-100/50">
                            <Table.HeaderCell className="pl-4">Cửa hàng trực thuộc</Table.HeaderCell>
                            <Table.HeaderCell className="text-center">Đơn thành công</Table.HeaderCell>
                            <Table.HeaderCell className="text-right">Đã khớp nợ</Table.HeaderCell>
                            <Table.HeaderCell className="text-right">Nợ hiện tại</Table.HeaderCell>
                            <Table.HeaderCell className="text-right pr-4">Hành động</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {seller.shops?.length === 0 ? (
                            <Table.Row>
                              <Table.Cell {...({ colSpan: 5 } as any)} className="text-center py-4 text-gray-400 italic">
                                Chưa liên kết shop vệ tinh nào.
                              </Table.Cell>
                            </Table.Row>
                          ) : (
                            seller.shops.map((shop: any) => (
                              <Table.Row key={shop.shop_id} className="bg-white hover:bg-gray-50/80 transition">
                                <Table.Cell className="font-bold text-gray-800 pl-4">🏪 {shop.shop_name}</Table.Cell>
                                <Table.Cell className="text-center font-medium text-gray-600">{shop.successful_orders_count} đơn</Table.Cell>
                                <Table.Cell className="text-right text-green-600 font-bold">${shop.total_paid.toFixed(2)}</Table.Cell>
                                <Table.Cell className="text-right">
                                  {shop.current_debt > 0 ? (
                                    <span className="text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 text-xs font-black">
                                      ${shop.current_debt.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1 text-xs font-bold">
                                      Sạch nợ
                                    </span>
                                  )}
                                </Table.Cell>
                                <Table.Cell className="text-right pr-4">
                                  <Button 
                                    variant="secondary" 
                                    size="small" 
                                    onClick={() => openPaymentModal(shop)}
                                    disabled={shop.current_debt <= 0}
                                    className="text-xs font-bold shadow-sm"
                                  >
                                    Gạch nợ
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))
                          )}
                        </Table.Body>
                      </Table>
                    </div>
                  )}
                </Container>
              );
            })
          )}
        </div>
      ) : (
        /* TAB 2: LỊCH SỬ DUYỆT GẠCH NỢ TOÀN CỤC */
        <Container className="p-0 overflow-hidden border border-gray-200 shadow-sm rounded-xl bg-white">
          <Table>
            <Table.Header>
              <Table.Row className="bg-gray-50">
                <Table.HeaderCell className="pl-4">Mã Khớp Lệnh (Txn ID)</Table.HeaderCell>
                <Table.HeaderCell>Cửa hàng (Shop)</Table.HeaderCell>
                <Table.HeaderCell>Kỳ hạch toán</Table.HeaderCell>
                <Table.HeaderCell className="text-center">Số đơn chốt sổ</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Số tiền thu</Table.HeaderCell>
                <Table.HeaderCell className="pr-4">Ghi chú nghiệp vụ</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {recentPayments.length === 0 ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 6 } as any)} className="text-center py-12 text-gray-400 italic">
                    Chưa có lịch sử giao dịch gạch nợ nào được ghi nhận.
                  </Table.Cell>
                </Table.Row>
              ) : (
                recentPayments.map((pay: any) => (
                  <Table.Row key={pay.id} className="hover:bg-gray-50/50 transition">
                    <Table.Cell className="font-mono text-xs text-gray-400 pl-4">{pay.id}</Table.Cell>
                    <Table.Cell className="font-bold text-gray-800">🏪 {pay.shop_name}</Table.Cell>
                    <Table.Cell><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold text-gray-600">{pay.billing_cycle}</span></Table.Cell>
                    <Table.Cell className="text-center font-medium text-gray-600">{pay.total_successful_orders} đơn</Table.Cell>
                    <Table.Cell className="text-right font-black text-green-600">${pay.amount?.toFixed(2)}</Table.Cell>
                    <Table.Cell className="text-xs text-gray-400 italic max-w-[200px] truncate pr-4" title={pay.note || ""}>
                      {pay.note || "---"}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </Container>
      )}

      {/* MODAL THU TIỀN VÀ GẠCH NỢ THỦ CÔNG */}
      {isModalOpen && selectedShop && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSettleDebt} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-base text-gray-900">Ghi nhận thanh toán công nợ</h3>
              <p className="text-xs text-gray-500 mt-1">Khớp lệnh cho: <span className="font-bold text-gray-800">{selectedShop.shop_name}</span></p>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số tiền thực thu (USD) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 font-bold"
                />
                <p className="text-[11px] text-red-500 font-medium mt-1">Gợi ý thu đủ: ${selectedShop.current_debt.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kỳ chốt đối soát tài chính *</label>
                <input 
                  type="text" 
                  required
                  value={billingCycle} 
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-gray-900 text-white">
                Xác nhận & Khớp nợ
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
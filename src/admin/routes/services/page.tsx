import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, Trash } from "@medusajs/icons"
import { Button, Container, Heading, Input, Table, Switch, Text, Textarea, Tabs, Badge } from "@medusajs/ui"

export const config = defineRouteConfig({
  label: "Dịch vụ mở rộng",
  icon: DocumentText,
})

export default function ServicesAdminPage() {
  // ==========================================
  // STATE: TAB 1 - CẤU HÌNH DỊCH VỤ
  // ==========================================
  const [services, setServices] = useState<any[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const defaultForm = { id: "", title: "", description: "", icon: "", tagsInput: "", popular: false }
  const [form, setForm] = useState<any>(defaultForm)

  // ==========================================
  // STATE: TAB 2 - ĐƠN YÊU CẦU THIẾT KẾ
  // ==========================================
  const [requests, setRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [resultUrl, setResultUrl] = useState("")

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      const res = await fetch("/admin/services", { credentials: "include" }).then(r => r.json())
      setServices(res.services || [])
    } catch(e) { console.error(e) }
    setLoadingServices(false)
  }

  const fetchRequests = async () => {
    setLoadingRequests(true)
    try {
      const res = await fetch("/admin/service-requests", { credentials: "include" }).then(r => r.json())
      setRequests(res.requests || [])
    } catch (error) {
      console.error("Lỗi lấy danh sách đơn:", error)
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => { 
    fetchServices();
    fetchRequests(); 
  }, [])

  // ==========================================
  // HANDLERS: TAB 1
  // ==========================================
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedTags = form.tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    await fetch("/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: parsedTags })
    })
    setForm(defaultForm)
    fetchServices()
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm("Bạn có chắc chắn xóa dịch vụ này?")) return;
    await fetch(`/admin/services/${id}`, { method: "DELETE", credentials: "include" })
    fetchServices()
  }

  const handleEditClick = (svc: any) => {
    setForm({ ...svc, tagsInput: Array.isArray(svc.tags) ? svc.tags.join(", ") : "" })
  }

  // ==========================================
  // HANDLERS: TAB 2
  // ==========================================
  const handleOpenDeliver = (req: any) => {
    setSelectedReq(req)
    setResultUrl(req.result_image_url || "")
    setIsModalOpen(true)
  }

  const handleDeliverSubmit = async () => {
    if (!resultUrl.trim()) return alert("Vui lòng dán link file kết quả!")
    try {
      const res = await fetch(`/admin/service-requests/${selectedReq.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_image_url: resultUrl })
      })
      const data = await res.json();
      if(data.status === "success") {
        setIsModalOpen(false)
        setSelectedReq(null)
        setResultUrl("")
        alert("Đã giao file thành công! Chờ Seller duyệt.")
        fetchRequests() 
      } else {
        alert("Lỗi: " + data.error)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Heading>Quản lý Dịch vụ & Thiết kế</Heading>
      
      <Tabs defaultValue="requests">
        <Tabs.List className="mb-4">
          <Tabs.Trigger value="requests">Đơn yêu cầu ({requests.filter(r => r.status === 'in_process').length} chờ xử lý)</Tabs.Trigger>
          <Tabs.Trigger value="config">Cấu hình Dịch vụ</Tabs.Trigger>
        </Tabs.List>

        {/* =======================================================
            TAB 1: QUẢN LÝ YÊU CẦU (Đưa lên làm Tab Mặc định)
            ======================================================= */}
        <Tabs.Content value="requests" className="space-y-4">
          <Container className="p-0 overflow-hidden">
            {loadingRequests ? <div className="p-8 text-center text-gray-500">Đang tải dữ liệu đơn hàng...</div> : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Mã / Seller</Table.HeaderCell>
                    <Table.HeaderCell>Loại / SL</Table.HeaderCell>
                    <Table.HeaderCell>Ảnh Gốc</Table.HeaderCell>
                    <Table.HeaderCell className="max-w-[200px]">Ghi chú & Yêu cầu</Table.HeaderCell>
                    <Table.HeaderCell>Trạng thái</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">Thao tác</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {requests.length === 0 ? (
                    <Table.Row><Table.Cell colSpan={6} className="text-center py-8 text-gray-500">Chưa có đơn hàng nào.</Table.Cell></Table.Row>
                  ) : requests.map(req => (
                    <Table.Row key={req.id}>
                      <Table.Cell>
                        <Text size="small" weight="plus" className="font-mono">{req.id}</Text>
                        <Text size="xsmall" className="text-gray-500">{req.seller_id}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="small" color={req.type === 'remake' ? 'blue' : req.type === 'custom' ? 'purple' : 'orange'}>
                          {req.type.toUpperCase()}
                        </Badge>
                        <Text size="xsmall" className="mt-1 text-gray-500">SL: {req.quantity}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        {(() => {
                          try {
                            const links = JSON.parse(req.original_image_url || req.original_image);
                            return links.map((lnk: string, idx: number) => (
                              <a key={idx} href={lnk} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                                🔗 Ảnh {idx + 1}
                              </a>
                            ));
                          } catch {
                            return <a href={req.original_image_url || req.original_image} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">🔗 Xem Ảnh</a>;
                          }
                        })()}
                      </Table.Cell>
                      <Table.Cell className="max-w-[250px]">
                        <div className="text-xs truncate" title={req.instructions}>{req.instructions || "Không có ghi chú"}</div>
                        {req.revision_note && req.status === 'in_process' && (
                          <div className="mt-1 bg-red-50 text-red-600 p-1.5 rounded border border-red-100 text-[10px] whitespace-normal">
                            <strong>Khách yêu cầu sửa:</strong> {req.revision_note}
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {req.status === 'in_process' && <Badge color="blue">Đang Thiết Kế</Badge>}
                        {req.status === 'waiting_approval' && <Badge color="orange">Đợi Khách Duyệt</Badge>}
                        {req.status === 'completed' && <Badge color="green">Đã Hoàn Thành</Badge>}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {req.status === 'in_process' ? (
                          <Button variant="secondary" size="small" onClick={() => handleOpenDeliver(req)}>Giao File</Button>
                        ) : (
                          <Button variant="transparent" size="small" onClick={() => handleOpenDeliver(req)}>Sửa Link</Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Container>
        </Tabs.Content>

        {/* =======================================================
            TAB 2: CẤU HÌNH DỊCH VỤ
            ======================================================= */}
        <Tabs.Content value="config" className="space-y-4">
          <Container className="p-6">
            <form onSubmit={handleSaveService} className="grid grid-cols-6 gap-4 items-start">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tiêu đề dịch vụ *</label>
                <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Vd: Thiết kế lại" />
              </div>
              <div className="col-span-3">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Thẻ Tags (cách nhau dấu phẩy)</label>
                <Input value={form.tagsInput} onChange={e => setForm({...form, tagsInput: e.target.value})} placeholder="Vd: Design, Vector" />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.popular} onCheckedChange={v => setForm({...form, popular: v})} />
                  <Text size="small" weight="plus">Hot</Text>
                </div>
              </div>
              <div className="col-span-6">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Mô tả ngắn *</label>
                <Textarea required value={form.description} onChange={(e: any) => setForm({...form, description: e.target.value})} placeholder="Nhập mô tả..." rows={2} />
              </div>
              <div className="col-span-6">
                <label className="text-xs font-bold text-gray-500 mb-1 block">SVG Icon (Paste mã SVG thuần)</label>
                <Textarea value={form.icon} onChange={(e: any) => setForm({...form, icon: e.target.value})} placeholder="<svg>...</svg>" rows={2} />
              </div>
              <div className="col-span-6 flex gap-2 justify-end pt-2">
                {form.id && <Button type="button" variant="transparent" onClick={() => setForm(defaultForm)}>Hủy</Button>}
                <Button type="submit" variant="secondary" className="h-[36px] px-8 bg-gray-900 text-white">
                  {form.id ? 'Cập nhật' : 'Thêm Dịch vụ'}
                </Button>
              </div>
            </form>
          </Container>

          <Container className="p-0 overflow-hidden">
            {loadingServices ? <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div> : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Tiêu đề</Table.HeaderCell>
                    <Table.HeaderCell>Mô tả</Table.HeaderCell>
                    <Table.HeaderCell>Icon</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">Thao tác</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {services.map(svc => (
                    <Table.Row key={svc.id}>
                      <Table.Cell className="font-bold">
                        {svc.title}
                        {svc.popular && <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded">HOT</span>}
                      </Table.Cell>
                      <Table.Cell className="truncate max-w-[250px]" title={svc.description}>{svc.description}</Table.Cell>
                      <Table.Cell>
                        {svc.icon ? <div className="w-6 h-6 text-gray-600" dangerouslySetInnerHTML={{ __html: svc.icon }} /> : '---'}
                      </Table.Cell>
                      <Table.Cell className="text-right space-x-2">
                        <Button variant="transparent" onClick={() => handleEditClick(svc)}>Sửa</Button>
                        <Button variant="transparent" className="text-red-500" onClick={() => handleDeleteService(svc.id)}><Trash/></Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Container>
        </Tabs.Content>
      </Tabs>

      {/* =======================================================
          MODAL GIAO FILE CHO SELLER
          ======================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <Heading level="h2" className="text-lg">Bàn Giao File Thiết Kế</Heading>
              <Text size="small" className="text-gray-500 mt-1">Đơn hàng: {selectedReq?.id}</Text>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Link ảnh/file kết quả *</label>
                <Input placeholder="Dán link Google Drive, Imgur..." value={resultUrl} onChange={(e) => setResultUrl(e.target.value)} />
                <Text size="xsmall" className="text-gray-400 mt-1">Đảm bảo đã cấp quyền truy cập công khai cho link này.</Text>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="transparent" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleDeliverSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Gửi cho Seller</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

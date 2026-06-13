import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, CheckCircleSolid } from "@medusajs/icons"
import { Button, Container, Heading, Table, Badge, Input, Text, Textarea } from "@medusajs/ui"

// Khai báo route trên thanh menu Admin của Medusa
export const config = defineRouteConfig({
  label: "Đơn Thiết Kế",
  icon: DocumentText,
})

export default function DesignRequestsAdminPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // State cho Modal Giao file
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [resultUrl, setResultUrl] = useState("")

  const fetchRequests = async () => {
    setLoading(true)
    try {
      // Gọi API lấy toàn bộ đơn design (Cần viết thêm API backend cho route này)
      const res = await fetch("/admin/service-requests", { credentials: "include" }).then(r => r.json())
      setRequests(res.requests || [])
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    // Tạm thời tạo Mock Data để bạn xem UI trước khi nối API
    setRequests([
      {
        id: "REQ-001",
        seller_id: "sel_123",
        type: "remake",
        quantity: 1,
        instructions: "Vẽ lại nét mượt hơn, bỏ nền đen",
        original_image_url: "https://placehold.co/400",
        status: "in_process",
        revision_note: "Chỉnh viền sáng thêm một chút nữa nhé bạn", // Seller yêu cầu sửa lại
        created_at: new Date().toISOString()
      },
      {
        id: "REQ-002",
        seller_id: "sel_456",
        type: "enhance",
        quantity: 5,
        instructions: "Upscale lên 4K giúp mình",
        original_image_url: "https://placehold.co/400",
        status: "waiting_approval",
        created_at: new Date().toISOString()
      }
    ])
    setLoading(false)
    // Thực tế sẽ gọi: fetchRequests() 
  }, [])

  const handleOpenDeliver = (req: any) => {
    setSelectedReq(req)
    setResultUrl(req.result_image_url || "")
    setIsModalOpen(true)
  }

  const handleDeliverSubmit = async () => {
    if (!resultUrl.trim()) return alert("Vui lòng dán link file kết quả!")
    
    try {
      // Bỏ comment đoạn này để chạy API thật
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
        fetchRequests() // Load lại bảng
      } else {
        alert("Lỗi: " + data.error)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <Heading>Quản lý Yêu Cầu Thiết Kế</Heading>
      </div>
      
      <Container className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div> : (
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
                    <a href={req.original_image_url} target="_blank" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                      🔗 Xem Ảnh gốc
                    </a>
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
                      <Button variant="secondary" size="small" onClick={() => handleOpenDeliver(req)}>
                        Giao File
                      </Button>
                    ) : (
                      <Button variant="transparent" size="small" onClick={() => handleOpenDeliver(req)}>
                        Sửa Link
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>

      {/* Modal Bàn Giao File */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <Heading level="h2" className="text-lg">Bàn Giao File Thiết Kế</Heading>
              <Text size="small" className="text-gray-500 mt-1">Đơn hàng: {selectedReq?.id}</Text>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Link ảnh/file kết quả *</label>
                <Input 
                  placeholder="Dán link Google Drive, Imgur..." 
                  value={resultUrl} 
                  onChange={(e) => setResultUrl(e.target.value)} 
                />
                <Text size="xsmall" className="text-gray-400 mt-1">
                  Đảm bảo đã cấp quyền truy cập công khai cho link này.
                </Text>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="transparent" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleDeliverSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                Gửi cho Seller
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

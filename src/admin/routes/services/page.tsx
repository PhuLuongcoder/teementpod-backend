import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, Plus, Trash } from "@medusajs/icons"
import { Button, Container, Heading, Input, Table, Switch, Text, Textarea } from "@medusajs/ui"

export const config = defineRouteConfig({
  label: "Dịch vụ mở rộng",
  icon: DocumentText,
})

export default function ServicesAdminPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const defaultForm = { id: "", title: "", description: "", icon: "", tagsInput: "", popular: false }
  const [form, setForm] = useState<any>(defaultForm)

  const fetchServices = async () => {
    setLoading(true)
    const res = await fetch("/admin/services", { credentials: "include" }).then(r => r.json())
    setServices(res.services || [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse chuỗi tag (cách nhau dấu phẩy) thành array
    const parsedTags = form.tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    
    await fetch("/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: parsedTags })
    })
    setForm(defaultForm)
    fetchServices()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn xóa dịch vụ này?")) return;
    await fetch(`/admin/services/${id}`, { method: "DELETE", credentials: "include" })
    fetchServices()
  }

  const handleEditClick = (svc: any) => {
    setForm({
      ...svc,
      tagsInput: Array.isArray(svc.tags) ? svc.tags.join(", ") : ""
    })
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Heading>Quản lý Dịch vụ mở rộng</Heading>
      
      <Container className="p-6">
        <form onSubmit={handleSave} className="grid grid-cols-6 gap-4 items-start">
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Tiêu đề dịch vụ *</label>
            <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Vd: Đăng Ký TikTok Shop" />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Thẻ Tags (cách nhau bởi dấu phẩy)</label>
            <Input value={form.tagsInput} onChange={e => setForm({...form, tagsInput: e.target.value})} placeholder="Vd: TikTok, US Market" />
          </div>
          <div className="col-span-1 flex items-center justify-center pt-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.popular} onCheckedChange={v => setForm({...form, popular: v})} />
              <Text size="small" weight="plus">Hot (Phổ biến)</Text>
            </div>
          </div>
          <div className="col-span-6">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Mô tả ngắn *</label>
            <Textarea required value={form.description} onChange={(e: any) => setForm({...form, description: e.target.value})} placeholder="Nhập mô tả..." rows={2} />
          </div>
          <div className="col-span-6">
            <label className="text-xs font-bold text-gray-500 mb-1 block">SVG Icon (Paste mã SVG thuần vào đây)</label>
            <Textarea value={form.icon} onChange={(e: any) => setForm({...form, icon: e.target.value})} placeholder="<svg>...</svg>" rows={3} />
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
        {loading ? <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div> : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tiêu đề</Table.HeaderCell>
                <Table.HeaderCell>Mô tả</Table.HeaderCell>
                <Table.HeaderCell>Tags</Table.HeaderCell>
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
                  <Table.Cell className="text-xs text-gray-500">{(svc.tags || []).join(", ")}</Table.Cell>
                  <Table.Cell>
                    {/* Render raw SVG safely via dangerouslySetInnerHTML for preview */}
                    {svc.icon ? (
                      <div className="w-6 h-6 text-gray-600" dangerouslySetInnerHTML={{ __html: svc.icon }} />
                    ) : '---'}
                  </Table.Cell>
                  <Table.Cell className="text-right space-x-2">
                    <Button variant="transparent" onClick={() => handleEditClick(svc)}>Sửa</Button>
                    <Button variant="transparent" className="text-red-500" onClick={() => handleDelete(svc.id)}><Trash/></Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}
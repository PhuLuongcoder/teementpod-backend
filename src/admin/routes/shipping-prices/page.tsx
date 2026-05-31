import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { FlyingBox, Plus, Trash } from "@medusajs/icons"
import { Button, Container, Heading, Input, Table } from "@medusajs/ui"

export const config = defineRouteConfig({
  label: "Bảng giá Vận chuyển",
  icon: FlyingBox,
})

export default function ShippingPricesAdminPage() {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const defaultForm = { id: "", country_code: "US", first_item_cost: 0, additional_item_cost: 0 }
  const [form, setForm] = useState(defaultForm)

  const fetchPrices = async () => {
    setLoading(true)
    const res = await fetch("/admin/shipping-prices", { credentials: "include" }).then(r => r.json())
    setPrices(res.prices || [])
    setLoading(false)
  }

  useEffect(() => { fetchPrices() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/admin/shipping-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    setForm(defaultForm)
    fetchPrices()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cấu hình phí vận chuyển này?")) return;
    await fetch(`/admin/shipping-prices/${id}`, { method: "DELETE", credentials: "include" })
    fetchPrices()
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Heading>Cấu hình Bảng giá Vận chuyển Toàn hệ thống (Shipping Cost)</Heading>
      
      <Container className="p-6">
        <form onSubmit={handleSave} className="grid grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Quốc gia (US, CA, WW)</label>
            <Input required value={form.country_code} onChange={e => setForm({...form, country_code: e.target.value})} placeholder="Vd: US" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Món đầu tiên (First)</label>
            <Input required type="number" step="0.01" value={form.first_item_cost} onChange={e => setForm({...form, first_item_cost: Number(e.target.value)})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Món mua thêm (Add)</label>
            <Input required type="number" step="0.01" value={form.additional_item_cost} onChange={e => setForm({...form, additional_item_cost: Number(e.target.value)})} />
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit" variant="secondary" className="h-[32px] flex-1">
              {form.id ? 'Cập nhật giá ship' : <><Plus/> Thêm Biểu Phí</>}
            </Button>
            {form.id && (
              <Button type="button" variant="transparent" onClick={() => setForm(defaultForm)} className="h-[32px]">Hủy</Button>
            )}
          </div>
        </form>
      </Container>

      <Container className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Đang tải biểu phí vận chuyển...</div> : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Mã Quốc Gia</Table.HeaderCell>
                <Table.HeaderCell>Sản phẩm đầu (First)</Table.HeaderCell>
                <Table.HeaderCell>Sản phẩm tiếp theo (Additional)</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Thao tác</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {prices.length === 0 ? (
                <Table.Row>
                  <td colSpan={4} className="text-center p-8 text-gray-400 italic">Chưa có cấu hình biểu phí vận chuyển nào.</td>
                </Table.Row>
              ) : (
                prices.map(p => (
                  <Table.Row key={p.id}>
                    <Table.Cell className="font-bold text-blue-600">{p.country_code}</Table.Cell>
                    <Table.Cell>${p.first_item_cost?.toFixed(2)}</Table.Cell>
                    <Table.Cell>${p.additional_item_cost?.toFixed(2)}</Table.Cell>
                    <Table.Cell className="text-right space-x-2">
                      <Button variant="transparent" onClick={() => setForm(p)}>Sửa</Button>
                      <Button variant="transparent" className="text-red-500" onClick={() => handleDelete(p.id)}><Trash/></Button>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}
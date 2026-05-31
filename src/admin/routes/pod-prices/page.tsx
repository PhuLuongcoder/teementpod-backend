import { useState, useEffect, useRef } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar, Plus, Trash, ArrowDownTray, ArrowUpTray } from "@medusajs/icons"
import { Button, Container, Heading, Input, Table } from "@medusajs/ui"

export const config = defineRouteConfig({
  label: "Bảng giá POD",
  icon: CurrencyDollar,
})

export default function PodPricesAdminPage() {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const defaultForm = { id: "", product_type: "", size: "", base_cost: 0, extra_print_cost: 0 }
  const [form, setForm] = useState(defaultForm)
  
  // Khởi tạo ref điều hướng file input ngầm
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPrices = async () => {
    setLoading(true)
    const res = await fetch("/admin/pod-prices", { credentials: "include" }).then(r => r.json())
    setPrices(res.prices || [])
    setLoading(false)
  }

  useEffect(() => { fetchPrices() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/admin/pod-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    setForm(defaultForm)
    fetchPrices()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cấu hình giá này?")) return;
    await fetch(`/admin/pod-prices/${id}`, { method: "DELETE", credentials: "include" })
    fetchPrices()
  }

  // LOGIC XUẤT FILE CSV
  const handleExportCSV = () => {
    window.location.href = "/admin/pod-prices/csv";
  }

  // LOGIC ĐỌC VÀ IMPORT FILE CSV HÀNG LOẠT
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      setLoading(true);
      try {
        const response = await fetch("/admin/pod-prices/csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData: csvText })
        }).then(r => r.json());

        if (response.status === "success") {
          alert(response.message);
        } else {
          alert("Lỗi: " + response.error);
        }
        fetchPrices();
      } catch (err) {
        alert("Không thể kết nối đến máy chủ để tải dữ liệu.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* HEADER SECTION CHỨA CÁC NÚT BULK ACTION */}
      <div className="flex justify-between items-center">
        <Heading>Cấu hình Bảng giá Phôi (Base Cost)</Heading>
        <div className="flex gap-x-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-sm h-[32px]">
            <ArrowUpTray width={14} height={14} /> Nhập CSV (Bulk)
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1 text-sm h-[32px]">
            <ArrowDownTray width={14} height={14} /> Xuất Bảng Giá (.csv)
          </Button>
        </div>
      </div>
      
      {/* FORM NHẬP NHANH */}
      <Container className="p-6">
        <form onSubmit={handleSave} className="grid grid-cols-6 gap-4 items-end">
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Loại SP</label>
            <Input required value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})} placeholder="Vd: T-Shirt" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Size</label>
            <Input required value={form.size} onChange={e => setForm({...form, size: e.target.value})} placeholder="Vd: XL" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Giá gốc ($)</label>
            <Input required type="number" step="0.01" value={form.base_cost} onChange={e => setForm({...form, base_cost: Number(e.target.value)})} />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">In thêm/mặt ($)</label>
            <Input required type="number" step="0.01" value={form.extra_print_cost} onChange={e => setForm({...form, extra_print_cost: Number(e.target.value)})} />
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit" variant="secondary" className="h-[32px] flex-1">
              {form.id ? 'Cập nhật' : <><Plus/> Thêm Mới</>}
            </Button>
            {form.id && (
              <Button type="button" variant="transparent" onClick={() => setForm(defaultForm)} className="h-[32px]">Hủy</Button>
            )}
          </div>
        </form>
      </Container>

      {/* BẢNG HIỂN THỊ DỮ LIỆU */}
      <Container className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Đang đồng bộ biểu phí hệ thống...</div> : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Loại Sản Phẩm</Table.HeaderCell>
                <Table.HeaderCell>Size</Table.HeaderCell>
                <Table.HeaderCell>Giá Gốc (Base Cost)</Table.HeaderCell>
                <Table.HeaderCell>Phí In Mặt Phụ</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Thao tác</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {prices.map(p => (
                <Table.Row key={p.id}>
                  <Table.Cell className="font-medium">{p.product_type}</Table.Cell>
                  <Table.Cell>{p.size}</Table.Cell>
                  <Table.Cell className="font-bold text-gray-900">${p.base_cost.toFixed(2)}</Table.Cell>
                  <Table.Cell className="text-gray-500">${p.extra_print_cost.toFixed(2)}</Table.Cell>
                  <Table.Cell className="text-right space-x-2">
                    <Button variant="transparent" onClick={() => setForm(p)}>Sửa</Button>
                    <Button variant="transparent" className="text-red-500" onClick={() => handleDelete(p.id)}><Trash/></Button>
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
import { useState, useEffect, useRef } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Component, Trash, ArrowDownTray, ArrowUpTray } from "@medusajs/icons"
import { Button, Container, Heading, Input, Table, Switch, Text, Textarea } from "@medusajs/ui"

export const config = defineRouteConfig({
  label: "Kho Phôi POD",
  icon: Component,
})

export default function PodBlanksAdminPage() {
  const [blanks, setBlanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const defaultForm = { 
    id: "", sku: "", name: "", image_url: "", material: "", in_stock: true, display_price: 0, description: "",
    colorsInput: "Black, White, Navy",
    sizesInput: "S, M, L, XL, 2XL",
    out_of_stock_variants: [],
    category: "T-shirt"
  }
  const [form, setForm] = useState<any>(defaultForm)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchBlanks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/pod-blanks", { credentials: "include" }).then(r => r.json())
      setBlanks(res.blanks || [])
    } catch (e) {
      console.error("Lỗi tải danh sách phôi:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBlanks() }, [])

  // ==========================================
  // XUẤT VÀ NHẬP CSV (ĐÃ FIX LỖI BLOB + 401)
  // ==========================================
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/pod-blanks/csv", { credentials: "include" });
      if (!response.ok) throw new Error("Không có quyền tải hoặc lỗi Server");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pod_blanks_catalog.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Lỗi xuất file. Hãy F5 tải lại trang để làm mới phiên đăng nhập!");
    } finally {
      setLoading(false);
    }
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      setLoading(true);
      try {
        const response = await fetch("/admin/pod-blanks/csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData: csvText })
        }).then(r => r.json());

        if (response.status === "success") {
          alert(response.message);
        } else {
          alert("Có lỗi xảy ra: " + response.error);
        }
        fetchBlanks();
      } catch (err) {
        console.error("Lỗi upload CSV:", err);
        alert("Không thể kết nối đến máy chủ để tải file.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  // ==========================================
  // LOGIC MATRIX VÀ FORM LƯU THỦ CÔNG
  // ==========================================
  const parsedColors = form.colorsInput.split(",").map((c: string) => c.trim()).filter(Boolean);
  const parsedSizes = form.sizesInput.split(",").map((s: string) => s.trim()).filter(Boolean);

  const toggleVariantStock = (color: string, size: string) => {
    const currentOos = [...form.out_of_stock_variants];
    const index = currentOos.findIndex((v: any) => v.color === color && v.size === size);
    
    if (index > -1) {
      currentOos.splice(index, 1);
    } else {
      currentOos.push({ color, size });
    }
    setForm({ ...form, out_of_stock_variants: currentOos });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      id: form.id,
      sku: form.sku,
      name: form.name,
      image_url: form.image_url,
      material: form.material,
      in_stock: form.in_stock,
      display_price: form.display_price,
      description: form.description,
      colors: parsedColors,
      sizes: parsedSizes,
      out_of_stock_variants: form.out_of_stock_variants
    }

    await fetch("/admin/pod-blanks", {
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(payload)
    })
    setForm(defaultForm)
    fetchBlanks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa phôi này?")) return;
    await fetch(`/admin/pod-blanks/${id}`, { method: "DELETE", credentials: "include" })
    fetchBlanks()
  }

  const handleEditClick = (blank: any) => {
    setForm({
      ...blank,
      colorsInput: Array.isArray(blank.colors) ? blank.colors.join(", ") : "Black, White",
      sizesInput: Array.isArray(blank.sizes) ? blank.sizes.join(", ") : "S, M, L, XL",
      out_of_stock_variants: Array.isArray(blank.out_of_stock_variants) ? blank.out_of_stock_variants : []
    });
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex justify-between items-center">
        <Heading>Quản lý Kho Phôi & Tồn Kho Biến Thể</Heading>
        <div className="flex gap-x-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-sm h-[32px]">
            <ArrowUpTray width={14} height={14} /> Nhập CSV
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1 text-sm h-[32px]">
            <ArrowDownTray width={14} height={14} /> Xuất Catalog
          </Button>
        </div>
      </div>
      
      <Container className="p-6">
        <form onSubmit={handleSave} className="grid grid-cols-6 gap-4 items-start">
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Mã Phôi (SKU)</label>
            <Input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Vd: TS-2D" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Danh mục (Loại)</label>
            <Input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Vd: Hoodie, T-Shirt..." />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Tên Phôi</label>
            <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Vd: T-Shirt 2D Premium" />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Link Ảnh (URL)</label>
            <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Danh sách Màu Sắc (Phân tách bằng dấu phẩy)</label>
            <Input value={form.colorsInput} onChange={e => setForm({...form, colorsInput: e.target.value})} placeholder="Black, White, Navy, Red" />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Danh sách Sizes (Phân tách bằng dấu phẩy)</label>
            <Input value={form.sizesInput} onChange={e => setForm({...form, sizesInput: e.target.value})} placeholder="S, M, L, XL, 2XL" />
          </div>
          <div className="col-span-4">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Chất liệu</label>
            <Input value={form.material} onChange={e => setForm({...form, material: e.target.value})} placeholder="100% Cotton, 200gsm..." />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Giá gốc ($)</label>
            <Input required type="number" step="0.01" value={form.display_price} onChange={e => setForm({...form, display_price: Number(e.target.value)})} />
          </div>
          <div className="col-span-1 flex flex-col items-center justify-center pt-6">
             <div className="flex items-center gap-2">
                <Switch checked={form.in_stock} onCheckedChange={v => setForm({...form, in_stock: v})} />
                <Text size="small" weight="plus">In Stock</Text>
             </div>
          </div>
          <div className="col-span-6">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Mô tả thông số phôi chi tiết</label>
            <Textarea 
              value={form.description || ""} 
              onChange={(e: any) => setForm({...form, description: e.target.value})} 
              placeholder="Nhập thông tin chi tiết về form dáng, chất vải, thông số size chart hoặc cách bảo quản..." 
              rows={3} 
            />
          </div>
          {parsedColors.length > 0 && parsedSizes.length > 0 && (
            <div className="col-span-6 border border-gray-100 bg-gray-50/50 p-4 rounded-xl mt-2">
              <label className="text-xs font-black text-gray-700 mb-3 block uppercase tracking-wider">
                🛡️ Ma trận thiết lập phân loại hết hàng (Click vào ô vuông để đánh dấu HẾT HÀNG)
              </label>
              <div className="overflow-x-auto">
                <table className="min-w-full text-center text-xs border bg-white">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b">
                      <th className="p-2 border-r text-gray-500">Màu \ Size</th>
                      {parsedSizes.map((size: string) => <th key={size} className="p-2 border-r">{size}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedColors.map((color: string) => (
                      <tr key={color} className="border-b">
                        <td className="p-2 font-bold border-r text-left bg-gray-50/30">{color}</td>
                        {parsedSizes.map((size: string) => {
                          const isOos = form.out_of_stock_variants.some((v: any) => v.color === color && v.size === size);
                          return (
                            <td key={size} className="p-2 border-r">
                              <button
                                type="button"
                                onClick={() => toggleVariantStock(color, size)}
                                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                                  isOos 
                                    ? 'bg-red-100 text-red-700 border border-red-300' 
                                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                }`}
                              >
                                {isOos ? 'HẾT HÀNG' : 'Còn hàng'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="col-span-6 flex gap-2 justify-end pt-2">
            {form.id && <Button type="button" variant="transparent" onClick={() => setForm(defaultForm)}>Hủy chỉnh sửa</Button>}
            <Button type="submit" variant="secondary" className="h-[36px] px-8 bg-gray-900 text-white">
              {form.id ? 'Cập nhật phôi' : 'Thêm phôi sản phẩm'}
            </Button>
          </div>
        </form>
      </Container>

      {/* DANH SÁCH BẢNG HIỂN THỊ */}
      <Container className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Đang thực hiện đồng bộ dữ liệu hệ thống...</div> : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Ảnh</Table.HeaderCell>
                <Table.HeaderCell>Mã (SKU)</Table.HeaderCell>
                <Table.HeaderCell>Tên Phôi</Table.HeaderCell>
                <Table.HeaderCell>Thuộc tính màu & size</Table.HeaderCell>
                <Table.HeaderCell>Giá</Table.HeaderCell>
                <Table.HeaderCell>Tổng Kho</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Thao tác</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {blanks.map(p => (
                <Table.Row key={p.id}>
                  <Table.Cell><img src={p.image_url || 'https://placehold.co/100'} className="w-10 h-10 object-cover rounded-md border" alt="img"/></Table.Cell>
                  <Table.Cell className="font-bold">{p.sku}</Table.Cell>
                  <Table.Cell>{p.name}</Table.Cell>
                  <Table.Cell className="text-xs text-gray-500 max-w-[220px] truncate">
                    <div>🎨 {Array.isArray(p.colors) ? p.colors.join(', ') : '---'}</div>
                    <div className="mt-1">📏 {Array.isArray(p.sizes) ? p.sizes.join(', ') : '---'}</div>
                  </Table.Cell>
                  <Table.Cell className="font-bold text-gray-900">${p.display_price?.toFixed(2)}</Table.Cell>
                  <Table.Cell>
                    {p.in_stock ? <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">Hoạt động</span> : <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">Khóa</span>}
                  </Table.Cell>
                  <Table.Cell className="text-right space-x-2">
                    <Button variant="transparent" onClick={() => handleEditClick(p)}>Sửa</Button>
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

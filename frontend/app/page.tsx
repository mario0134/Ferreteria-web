'use client';

import React, { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'VENDEDOR';
}

interface SystemUser extends UserSession {
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Product {
  id: number;
  code: string;
  name: string;
  category_id: number;
  category_name?: string;
  purchase_price: string | number;
  sale_price: string | number;
  stock: number;
  min_stock: number;
  is_active?: boolean;
}

interface Sale {
  id: number;
  sale_code: string;
  subtotal: string | number;
  total: string | number;
  status: string;
  payment_method?: 'EFECTIVO' | 'QR' | string;
  customer_name?: string | null;
  seller_name?: string | null;
  created_at: string;
}

interface SaleDetail extends Sale {
  items: Array<{
    id: number;
    product_id: number;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price: string | number;
    line_total: string | number;
  }>;
}

interface Movement {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  reference: string | null;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Summary {
  total_sales_count: number;
  total_sales_amount: string | number;
  active_products_count: number;
  low_stock_count: number;
}

interface DetailedReport {
  sales: {
    completed_count: number;
    completed_amount: string | number;
    cancelled_count: number;
    cancelled_amount: string | number;
  };
  movements: {
    in_count: number;
    in_units: number;
    out_count: number;
    out_units: number;
  };
  products: Array<{
    id: number;
    code: string;
    name: string;
    category_name: string | null;
    purchase_price: string | number;
    sale_price: string | number;
    stock: number;
    min_stock: number;
    is_active: boolean;
    inventory_cost_value: string | number;
  }>;
}

interface CartLine {
  product_id: number;
  quantity: number;
}

type TabKey = 'ventas' | 'catalogo' | 'inventario' | 'contactos' | 'reportes' | 'usuarios';

export default function FerreteriaPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('ventas');
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@ferreteria.bo');
  const [loginPassword, setLoginPassword] = useState('admin123');

  const [summary, setSummary] = useState<Summary>({
    total_sales_count: 0,
    total_sales_amount: '0.00',
    active_products_count: 0,
    low_stock_count: 0,
  });
  const [detailedReport, setDetailedReport] = useState<DetailedReport>({
    sales: { completed_count: 0, completed_amount: '0.00', cancelled_count: 0, cancelled_amount: '0.00' },
    movements: { in_count: 0, in_units: 0, out_count: 0, out_units: 0 },
    products: [],
  });
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [askPrintSale, setAskPrintSale] = useState<SaleDetail | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Buscadores
  const [searchProd, setSearchProd] = useState('');
  const [saleProdSearch, setSaleProdSearch] = useState('');
  const [saleCustSearch, setSaleCustSearch] = useState('');
  const [entryProdSearch, setEntryProdSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [suppSearch, setSuppSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [movSearch, setMovSearch] = useState('');

  // Cliente rápido dentro del carrito
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');

  // Edición rápida de producto
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdSalePrice, setEditProdSalePrice] = useState('');
  const [editProdMinStock, setEditProdMinStock] = useState('');

  // Carrito de venta multi-ítem
  const [saleCustomerId, setSaleCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'QR'>('EFECTIVO');
  const [draftProdId, setDraftProdId] = useState<number>(1);
  const [draftQty, setDraftQty] = useState<number>(1);
  const [cart, setCart] = useState<CartLine[]>([]);

  // Categoría
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Producto
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCatId, setProdCatId] = useState<number>(1);
  const [prodPurchase, setProdPurchase] = useState('10.00');
  const [prodSale, setProdSale] = useState('15.00');
  const [prodStock, setProdStock] = useState('10');
  const [prodMinStock, setProdMinStock] = useState('5');

  // Entrada de inventario
  const [entryProdId, setEntryProdId] = useState<number>(1);
  const [entryQty, setEntryQty] = useState<number>(5);
  const [entryRef, setEntryRef] = useState('Compra / Reposición de almacén');

  // Cliente y proveedor
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');

  const [suppName, setSuppName] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppPhone, setSuppPhone] = useState('');

  // Nuevo usuario del sistema
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'VENDEDOR'>('VENDEDOR');

  function getAuthHeaders(includeJson = true): Record<string, string> {
    const h: Record<string, string> = {};
    if (includeJson) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  function requireSession(actionLabel: string): boolean {
    if (!user || !token) {
      setError(`Debes iniciar sesión para ${actionLabel}.`);
      setShowLoginModal(true);
      return false;
    }
    return true;
  }

  async function loadAll(currentToken?: string) {
    try {
      setError('');
      const authHeaders: Record<string, string> = {};
      const activeTok = currentToken !== undefined ? currentToken : token;
      if (activeTok) {
        authHeaders.Authorization = `Bearer ${activeTok}`;
      }

      const [sumRes, detRes, usersRes, catRes, prodRes, salesRes, movRes, lowRes, custRes, suppRes] =
        await Promise.all([
          fetch(`${API_URL}/reports/summary`),
          fetch(`${API_URL}/reports/detailed`),
          activeTok ? fetch(`${API_URL}/users`, { headers: authHeaders }) : Promise.resolve(null),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/products`),
          fetch(`${API_URL}/sales`),
          fetch(`${API_URL}/inventory/movements`),
          fetch(`${API_URL}/inventory/low-stock`),
          fetch(`${API_URL}/customers`),
          fetch(`${API_URL}/suppliers`),
        ]);

      if (!catRes.ok || !prodRes.ok || !salesRes.ok) {
        throw new Error('Error al consultar la API en ' + API_URL);
      }

      const [sumData, detData, usersData, catData, prodData, salesData, movData, lowData, custData, suppData] =
        await Promise.all([
          sumRes.ok ? sumRes.json() : summary,
          detRes.ok ? detRes.json() : detailedReport,
          usersRes && usersRes.ok ? usersRes.json() : [],
          catRes.json(),
          prodRes.json(),
          salesRes.json(),
          movRes.ok ? movRes.json() : [],
          lowRes.ok ? lowRes.json() : [],
          custRes.ok ? custRes.json() : [],
          suppRes.ok ? suppRes.json() : [],
        ]);

      setSummary(sumData);
      setDetailedReport(detData);
      setSystemUsers(Array.isArray(usersData) ? usersData : []);
      setCategories(catData);
      setProducts(prodData);
      setSales(salesData);
      setMovements(movData);
      setLowStock(lowData);
      setCustomers(custData);
      setSuppliers(suppData);

      if (catData.length > 0 && !catData.some((c: Category) => c.id === prodCatId)) {
        setProdCatId(catData[0].id);
      }
      if (prodData.length > 0) {
        if (!prodData.some((p: Product) => p.id === draftProdId)) setDraftProdId(prodData[0].id);
        if (!prodData.some((p: Product) => p.id === entryProdId)) setEntryProdId(prodData[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar los datos');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Credenciales inválidas');
      setToken(data.access_token);
      setUser(data.user);
      setShowLoginModal(false);
      setActiveTab('ventas');
      setMessage(`Sesión iniciada como ${data.user.name} (${data.user.role})`);
      await loadAll(data.access_token);
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
    }
  }

  function handleLogout() {
    setUser(null);
    setToken('');
    setSystemUsers([]);
    setActiveTab('ventas');
    setMessage('Sesión cerrada.');
  }

  async function handleQuickCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('registrar clientes')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: quickCustName, phone: quickCustPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear cliente');
      setQuickCustName('');
      setQuickCustPhone('');
      setShowQuickCustomer(false);
      setSaleCustomerId(String(data.id));
      setMessage(`Cliente "${data.name}" agregado y seleccionado en la venta.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear cliente');
    }
  }

  function addToCart() {
    if (!requireSession('agregar productos a la venta')) return;
    const qty = Number(draftQty);
    if (!draftProdId || !Number.isInteger(qty) || qty <= 0) {
      setError('Seleccione un producto y cantidad entera mayor a 0');
      return;
    }
    setError('');
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === draftProdId);
      if (existing) {
        return prev.map((item) =>
          item.product_id === draftProdId ? { ...item, quantity: item.quantity + qty } : item,
        );
      }
      return [...prev, { product_id: draftProdId, quantity: qty }];
    });
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  }

  const cartPreviewTotal = cart.reduce((acc, line) => {
    const prod = products.find((p) => p.id === line.product_id);
    if (!prod) return acc;
    return acc + Number(prod.sale_price) * line.quantity;
  }, 0);

  async function handleConfirmCartSale() {
    if (!requireSession('confirmar ventas')) return;
    setMessage('');
    setError('');
    if (cart.length === 0) {
      setError('Agregue al menos un producto al carrito antes de confirmar la venta');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customer_id: saleCustomerId ? Number(saleCustomerId) : undefined,
          payment_method: paymentMethod,
          items: cart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al registrar venta');
      setCart([]);
      setMessage(`Venta ${data.sale_code} confirmada por Bs ${data.total}`);
      await loadAll();
      const detailRes = await fetch(`${API_URL}/sales/${data.id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setSelectedSale(detail);
        setAskPrintSale(detail);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al registrar venta');
    }
  }

  async function handleCancelSale(saleId: number, saleCode: string) {
    if (!requireSession('anular ventas')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al anular venta');
      setMessage(`Venta ${saleCode} anulada y stock devuelto al inventario`);
      if (selectedSale?.id === saleId) {
        await handleViewSaleDetail(saleId);
      }
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al anular venta');
    }
  }

  async function handleViewSaleDetail(saleId: number) {
    try {
      const res = await fetch(`${API_URL}/sales/${saleId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedSale(detail);
      }
    } catch {
      // ignora errores puntuales de detalle
    }
  }

  function startEditProduct(p: Product) {
    if (!requireSession('editar productos')) return;
    setEditingProdId(p.id);
    setEditProdName(p.name);
    setEditProdSalePrice(String(p.sale_price));
    setEditProdMinStock(String(p.min_stock));
  }

  async function handleSaveEditProduct(productId: number) {
    if (!requireSession('guardar cambios de producto')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editProdName,
          sale_price: Number(editProdSalePrice),
          min_stock: Number(editProdMinStock),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al actualizar producto');
      setEditingProdId(null);
      setMessage(`Producto ${data.code} actualizado`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar producto');
    }
  }

  async function handleToggleProductStatus(p: Product) {
    if (!requireSession('cambiar estado de productos')) return;
    setMessage('');
    setError('');
    const nextActive = p.is_active === false ? true : false;
    try {
      const res = await fetch(`${API_URL}/products/${p.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al cambiar estado');
      setMessage(`Producto ${data.code} ahora está ${nextActive ? 'ACTIVO' : 'INACTIVO'}`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar estado');
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('crear categorías')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear categoría');
      setCatName('');
      setCatDesc('');
      setMessage(`Categoría "${data.name}" creada`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear categoría');
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('crear productos')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: prodCode,
          name: prodName,
          category_id: Number(prodCatId),
          purchase_price: Number(prodPurchase),
          sale_price: Number(prodSale),
          stock: Number(prodStock),
          min_stock: Number(prodMinStock),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear producto');
      setProdCode('');
      setProdName('');
      setMessage(`Producto "${data.name}" registrado`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear producto');
    }
  }

  async function handleRegisterEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('registrar entradas de inventario')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/inventory/entries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: Number(entryProdId),
          quantity: Number(entryQty),
          reference: entryRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al registrar entrada');
      setMessage(`Entrada registrada: +${entryQty} en ${data.product.code} (Nuevo stock: ${data.product.stock})`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar entrada');
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('registrar clientes')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: custName, phone: custPhone, email: custEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear cliente');
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setMessage(`Cliente "${data.name}" registrado`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear cliente');
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('registrar proveedores')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: suppName, contact_name: suppContact, phone: suppPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear proveedor');
      setSuppName('');
      setSuppContact('');
      setSuppPhone('');
      setMessage(`Proveedor "${data.name}" registrado`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear proveedor');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!requireSession('crear usuarios')) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al crear usuario');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setMessage(`Usuario "${data.name}" (${data.role}) creado correctamente`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error al crear usuario');
    }
  }

    function handlePrintDetailedReport() {
    const rowsHtml = detailedReport.products
      .map(
        (p) =>
          '<tr>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;font-family:monospace;">' + p.code + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;">' + p.name + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;">' + (p.category_name || '-') + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">Bs ' + p.purchase_price + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">Bs ' + p.sale_price + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">' + p.stock + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">Bs ' + p.inventory_cost_value + '</td>' +
          '</tr>'
      )
      .join('');

    const html =
      '<!doctype html><html><head><meta charset="utf-8"><title>Reporte Detallado - Ferreteria</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#0f172a;padding:24px;}h1{margin:0 0 6px;font-size:20px;}' +
      '.meta{color:#475569;font-size:12px;margin-bottom:16px;}.grid{display:flex;gap:16px;margin-bottom:18px;}' +
      '.card{flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:12px;}.card h3{margin:0 0 6px;font-size:13px;color:#334155;}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px;text-align:left;}</style></head><body>' +
      '<h1>Reporte Detallado de Gestion, Ventas e Inventario</h1>' +
      '<div class="meta">Ferreteria · Santa Cruz, Bolivia · Generado: ' + new Date().toLocaleString() + '</div>' +
      '<div class="grid">' +
      '<div class="card"><h3>Ventas</h3><div>Completadas (' + detailedReport.sales.completed_count + '): <strong>Bs ' + detailedReport.sales.completed_amount + '</strong></div>' +
      '<div>Anuladas (' + detailedReport.sales.cancelled_count + '): <strong>Bs ' + detailedReport.sales.cancelled_amount + '</strong></div></div>' +
      '<div class="card"><h3>Movimientos de Inventario</h3><div>Entradas IN (' + detailedReport.movements.in_count + ' reg.): <strong>+' + detailedReport.movements.in_units + ' unid.</strong></div>' +
      '<div>Salidas OUT (' + detailedReport.movements.out_count + ' reg.): <strong>-' + detailedReport.movements.out_units + ' unid.</strong></div></div>' +
      '</div>' +
      '<h2 style="font-size:15px;margin-bottom:6px;">Detalle Valorizado de Inventario</h2>' +
      '<table><thead><tr><th>Codigo</th><th>Producto</th><th>Categoria</th><th>P. Compra</th><th>P. Venta</th><th>Stock</th><th>Valor Costo Stock</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<script>window.onload=function(){window.print();};</script></body></html>';

    const win = window.open('', '_blank', 'width=900,height=650');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  const activeProductsForSale = products.filter((p) => p.is_active !== false);

  const saleFilteredProducts = activeProductsForSale.filter((p) => {
    const q = saleProdSearch.trim().toLowerCase();
    if (!q) return true;
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  const saleFilteredCustomers = customers.filter((c) => {
    const q = saleCustSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  const entryFilteredProducts = products.filter((p) => {
    const q = entryProdSearch.trim().toLowerCase();
    if (!q) return true;
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  const filteredProducts = products.filter((p) => {
    const q = searchProd.trim().toLowerCase();
    if (!q) return true;
    return (
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = suppSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  });

    const filteredSales = sales.filter((s) => {
    const q = salesSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.sale_code.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q) ||
      (s.customer_name || '').toLowerCase().includes(q)
    );
  });

  const filteredMovements = movements.filter((m) => {
    const q = movSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.movement_type.toLowerCase().includes(q) ||
      m.product_code.toLowerCase().includes(q) ||
      m.product_name.toLowerCase().includes(q) ||
      (m.reference || '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = systemUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const visibleTabs: Array<[TabKey, string]> =
    user?.role === 'VENDEDOR'
      ? [
          ['ventas', 'Nueva Venta e Historial'],
          ['catalogo', 'Productos y Categorías'],
          ['contactos', 'Clientes y Proveedores'],
        ]
      : [
          ['ventas', 'Nueva Venta e Historial'],
          ['catalogo', 'Productos y Categorías'],
          ['inventario', 'Entradas y Movimientos'],
          ['contactos', 'Clientes y Proveedores'],
          ['reportes', 'Reportes Detallados'],
          ['usuarios', 'Usuarios y Roles'],
        ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Modal limpio de inicio de sesión */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-400">Iniciar Sesión</h2>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm"
              >
                Ingresar al sistema
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pregunta / comprobante al confirmar venta */}
      {askPrintSale && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-700 rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-emerald-400">
              Venta {askPrintSale.sale_code} confirmada
            </h2>
            <p className="text-sm text-slate-300">
              Total: <strong>Bs {askPrintSale.total}</strong>. ¿Deseas imprimir el comprobante de venta ahora?
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-amber-300">Comprobante {askPrintSale.sale_code}</p>
              <p className="text-slate-400">Cliente: {askPrintSale.customer_name || 'Mostrador'} · Pago: <strong>{askPrintSale.payment_method || 'EFECTIVO'}</strong></p>
              {askPrintSale.items?.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>
                    {it.product_code} - {it.product_name} x{it.quantity}
                  </span>
                  <span>Bs {it.line_total}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAskPrintSale(null)}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs"
              >
                No, cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setAskPrintSale(null);
                }}
                className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
              >
                Sí, imprimir comprobante
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">
            Ferretería — Sistema de Gestión, Inventario y Ventas
          </h1>
          <p className="text-sm text-slate-400">
            Next.js + NestJS ({API_URL}) + PostgreSQL · Santa Cruz, Bolivia
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs">
              <span>
                <strong className="text-amber-300">{user.name}</strong> ({user.role})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      {!user && (
        <div className="p-3 rounded bg-amber-950/60 border border-amber-700/70 text-amber-200 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>
            Modo lectura: las operaciones de venta, inventario, catálogo y administración están bloqueadas hasta iniciar sesión.
          </span>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
          >
            Iniciar sesión ahora
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Ventas Confirmadas</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.total_sales_count}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Ingresos Acumulados</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">Bs {summary.total_sales_amount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Productos Activos</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">{summary.active_products_count}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400">Alertas Bajo Stock</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{summary.low_stock_count}</p>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {visibleTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              activeTab === key
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && (
        <div className="p-3 rounded bg-emerald-950 border border-emerald-700 text-emerald-200 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded bg-rose-950 border border-rose-700 text-rose-200 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'ventas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-amber-300">Carrito de Venta</h2>
              <button
                type="button"
                onClick={() => setShowQuickCustomer((v) => !v)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
              >
                {showQuickCustomer ? 'Ocultar nuevo cliente' : '+ Nuevo cliente rápido'}
              </button>
            </div>

            {showQuickCustomer && (
              <form
                onSubmit={handleQuickCreateCustomer}
                className="p-3 rounded bg-slate-950 border border-slate-700 space-y-2 text-sm"
              >
                <p className="text-xs font-semibold text-amber-300">Alta rápida de cliente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Teléfono (opcional)"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  Guardar y seleccionar cliente
                </button>
              </form>
            )}

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Buscar y seleccionar cliente (opcional)</label>
              <input
                type="text"
                placeholder="Buscar cliente por nombre o teléfono..."
                value={saleCustSearch}
                onChange={(e) => setSaleCustSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs"
              />
              <select
                value={saleCustomerId}
                onChange={(e) => setSaleCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              >
                <option value="">-- Sin cliente específico (Mostrador) --</option>
                {saleFilteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Buscar y agregar producto</label>
              <input
                type="text"
                placeholder="Buscar producto por código o nombre..."
                value={saleProdSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setSaleProdSearch(val);
                  const match = activeProductsForSale.find(
                    (p) =>
                      p.code.toLowerCase().includes(val.trim().toLowerCase()) ||
                      p.name.toLowerCase().includes(val.trim().toLowerCase()),
                  );
                  if (match && val.trim()) setDraftProdId(match.id);
                }}
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={draftProdId}
                  onChange={(e) => setDraftProdId(Number(e.target.value))}
                  className="sm:col-span-2 px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                >
                  {saleFilteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Stock: {p.stock} | Bs {p.sale_price})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={draftQty}
                    onChange={(e) => setDraftQty(Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addToCart}
                    className="flex-1 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm font-medium"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-800 rounded p-3 bg-slate-950/60 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Ítems en el carrito ({cart.length})</p>
              {cart.length === 0 ? (
                <p className="text-xs text-slate-500">Agrega uno o más productos para armar la venta.</p>
              ) : (
                cart.map((line) => {
                  const prod = products.find((p) => p.id === line.product_id);
                  const unit = prod ? Number(prod.sale_price) : 0;
                  return (
                    <div key={line.product_id} className="flex items-center justify-between text-sm">
                      <span>
                        {prod?.code} — {prod?.name} <strong>x{line.quantity}</strong> (Bs {(unit * line.quantity).toFixed(2)})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.product_id)}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  );
                })
              )}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-semibold">
                <span>Total estimado:</span>
                <span className="text-emerald-400">Bs {cartPreviewTotal.toFixed(2)}</span>
              </div>
            </div>

                                    <div>
              <label className="block text-xs text-slate-400 mb-1">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('EFECTIVO')}
                  className={
                    paymentMethod === 'EFECTIVO'
                      ? 'py-2 rounded text-xs font-semibold border transition bg-amber-500 text-slate-950 border-amber-400'
                      : 'py-2 rounded text-xs font-semibold border transition bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QR')}
                  className={
                    paymentMethod === 'QR'
                      ? 'py-2 rounded text-xs font-semibold border transition bg-amber-500 text-slate-950 border-amber-400'
                      : 'py-2 rounded text-xs font-semibold border transition bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }
                >
                  QR
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmCartSale}
              className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm"
            >
              Confirmar Venta y Descontar Stock
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Historial de Ventas ({filteredSales.length})</h2>
              <input
                type="text"
                placeholder="Buscar venta por código, cliente o estado..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs w-64"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-2">Código</th>
                    <th className="py-2 pr-2">Estado</th>
                    <th className="py-2 pr-2">Total</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-2 font-mono text-xs">{s.sale_code}</td>
                      <td className="py-2 pr-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            s.status === 'CANCELLED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 pr-2 font-semibold text-emerald-400">Bs {s.total}</td>
                      <td className="py-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewSaleDetail(s.id)}
                          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                        >
                          Ver ítems
                        </button>
                        {s.status !== 'CANCELLED' && user?.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleCancelSale(s.id, s.sale_code)}
                            className="text-xs px-2 py-1 rounded bg-rose-900/70 hover:bg-rose-800 text-rose-200"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSale && (
              <div className="mt-3 p-3 rounded bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-amber-300">
                  <span>
                    Detalle de {selectedSale.sale_code} ({selectedSale.status}) · Pago: {selectedSale.payment_method || 'EFECTIVO'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Total: Bs {selectedSale.total}</span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
                {selectedSale.items?.map((it) => (
                  <div key={it.id} className="flex justify-between text-slate-300">
                    <span>
                      {it.product_code} - {it.product_name} x{it.quantity} (@ Bs {it.unit_price})
                    </span>
                    <span>Bs {it.line_total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'catalogo' && (
        <div className="space-y-6">
          {user?.role === 'ADMIN' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleCreateCategory} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <h2 className="font-semibold text-lg text-amber-300">Nueva Categoría</h2>
                <input
                  type="text"
                  placeholder="Nombre (ej. Electricidad, Plomería)"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Descripción opcional"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                />
                <button type="submit" className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm">
                  Guardar Categoría
                </button>
              </form>

              <form onSubmit={handleCreateProduct} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <h2 className="font-semibold text-lg text-amber-300">Nuevo Producto</h2>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Código (ej. ELEC-001)"
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                    required
                  />
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(Number(e.target.value))}
                    className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Nombre del producto"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  required
                />
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Compra"
                    value={prodPurchase}
                    onChange={(e) => setProdPurchase(e.target.value)}
                    className="px-2 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Venta"
                    value={prodSale}
                    onChange={(e) => setProdSale(e.target.value)}
                    className="px-2 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="px-2 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Mínimo"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="px-2 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                    required
                  />
                </div>
                <button type="submit" className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm">
                  Guardar Producto
                </button>
              </form>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Catálogo de Productos ({filteredProducts.length})</h2>
              <input
                type="text"
                placeholder="Buscar por código, nombre o categoría..."
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)}
                className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm w-72"
              />
            </div>

            {editingProdId !== null && user?.role === 'ADMIN' && (
              <div className="p-3 rounded bg-slate-950 border border-amber-500/50 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-amber-300 font-semibold">Editando #{editingProdId}:</span>
                <input
                  type="text"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
                <input
                  type="number"
                  step="0.01"
                  value={editProdSalePrice}
                  onChange={(e) => setEditProdSalePrice(e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
                <input
                  type="number"
                  value={editProdMinStock}
                  onChange={(e) => setEditProdMinStock(e.target.value)}
                  className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => handleSaveEditProduct(editingProdId)}
                  className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold text-xs"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProdId(null)}
                  className="px-3 py-1 rounded bg-slate-800 text-xs"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3">Venta</th>
                    <th className="py-2 pr-3">Stock</th>
                    <th className="py-2 pr-3">Estado</th>
                    {user?.role === 'ADMIN' && <th className="py-2">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const active = p.is_active !== false;
                    return (
                      <tr key={p.id} className="border-b border-slate-800/60">
                        <td className="py-2 pr-3 font-mono">{p.code}</td>
                        <td className="py-2 pr-3">{p.name}</td>
                        <td className="py-2 pr-3">Bs {p.sale_price}</td>
                        <td className={`py-2 pr-3 font-semibold ${p.stock <= p.min_stock ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {p.stock} <span className="text-xs text-slate-500">(mín {p.min_stock})</span>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <span className={active ? 'text-emerald-400' : 'text-slate-500'}>
                            {active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        {user?.role === 'ADMIN' && (
                          <td className="py-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditProduct(p)}
                              className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(p)}
                              className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                            >
                              {active ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventario' && user?.role !== 'VENDEDOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <form onSubmit={handleRegisterEntry} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-lg text-amber-300">Registrar Entrada de Inventario (IN)</h2>
              <input
                type="text"
                placeholder="Buscar producto por código o nombre..."
                value={entryProdSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setEntryProdSearch(val);
                  const match = products.find(
                    (p) =>
                      p.code.toLowerCase().includes(val.trim().toLowerCase()) ||
                      p.name.toLowerCase().includes(val.trim().toLowerCase()),
                  );
                  if (match && val.trim()) setEntryProdId(match.id);
                }}
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs"
              />
              <select
                value={entryProdId}
                onChange={(e) => setEntryProdId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              >
                {entryFilteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} (Stock actual: {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={entryQty}
                onChange={(e) => setEntryQty(Number(e.target.value))}
                placeholder="Cantidad a ingresar"
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                required
              />
              <input
                type="text"
                value={entryRef}
                onChange={(e) => setEntryRef(e.target.value)}
                placeholder="Motivo o referencia (ej. Factura #104)"
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              />
              <button type="submit" className="w-full py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm">
                Registrar Entrada
              </button>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-lg text-rose-400">Productos con Bajo Stock ({lowStock.length})</h2>
              {lowStock.length === 0 ? (
                <p className="text-sm text-slate-400">Todos los productos están por encima de su stock mínimo.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {lowStock.map((p) => (
                    <li key={p.id} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span>
                        <strong className="font-mono">{p.code}</strong> — {p.name}
                      </span>
                      <span className="text-rose-400 font-semibold">
                        Stock: {p.stock} / Mín: {p.min_stock}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Movimientos de Inventario ({filteredMovements.length})</h2>
              <input
                type="text"
                placeholder="Buscar movimiento (IN/OUT, producto, ref)..."
                value={movSearch}
                onChange={(e) => setMovSearch(e.target.value)}
                className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs w-64"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Producto</th>
                    <th className="py-2 pr-2">Cant.</th>
                    <th className="py-2">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-800/60">
                      <td className={`py-2 pr-2 font-bold ${m.movement_type === 'IN' ? 'text-sky-400' : 'text-amber-400'}`}>
                        {m.movement_type}
                      </td>
                      <td className="py-2 pr-2">{m.product_code} - {m.product_name}</td>
                      <td className="py-2 pr-2 font-semibold">{m.quantity}</td>
                      <td className="py-2 text-slate-400 text-xs">{m.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contactos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Clientes ({filteredCustomers.length})</h2>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs"
              />
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-2">
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                />
                <input
                  type="email"
                  placeholder="Correo opcional"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                />
              </div>
              <button type="submit" className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm">
                Guardar Cliente
              </button>
            </form>
            <ul className="divide-y divide-slate-800 text-sm">
              {filteredCustomers.map((c) => (
                <li key={c.id} className="py-2 flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-slate-400">{c.phone || 'Sin teléfono'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Proveedores ({filteredSuppliers.length})</h2>
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={suppSearch}
                onChange={(e) => setSuppSearch(e.target.value)}
                className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs"
              />
            </div>
            {user?.role === 'ADMIN' && (
              <form onSubmit={handleCreateSupplier} className="space-y-2">
                <input
                  type="text"
                  placeholder="Razón social o nombre"
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Contacto"
                    value={suppContact}
                    onChange={(e) => setSuppContact(e.target.value)}
                    className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={suppPhone}
                    onChange={(e) => setSuppPhone(e.target.value)}
                    className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                  />
                </div>
                <button type="submit" className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm">
                  Guardar Proveedor
                </button>
              </form>
            )}
            <ul className="divide-y divide-slate-800 text-sm">
              {filteredSuppliers.map((s) => (
                <li key={s.id} className="py-2 flex justify-between">
                  <span>
                    {s.name} {s.contact_name ? <span className="text-slate-400">({s.contact_name})</span> : null}
                  </span>
                  <span className="text-slate-400">{s.phone || 'Sin teléfono'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'reportes' && user?.role !== 'VENDEDOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-lg text-amber-300">Resumen de Ventas por Estado</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded bg-slate-950 border border-emerald-800/60">
                  <p className="text-xs text-slate-400">Completadas ({detailedReport.sales.completed_count})</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    Bs {detailedReport.sales.completed_amount}
                  </p>
                </div>
                <div className="p-3 rounded bg-slate-950 border border-rose-800/60">
                  <p className="text-xs text-slate-400">Anuladas ({detailedReport.sales.cancelled_count})</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">
                    Bs {detailedReport.sales.cancelled_amount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-lg text-amber-300">Balance de Movimientos de Inventario</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded bg-slate-950 border border-sky-800/60">
                  <p className="text-xs text-slate-400">Entradas IN ({detailedReport.movements.in_count} reg.)</p>
                  <p className="text-xl font-bold text-sky-400 mt-1">
                    +{detailedReport.movements.in_units} unid.
                  </p>
                </div>
                <div className="p-3 rounded bg-slate-950 border border-amber-800/60">
                  <p className="text-xs text-slate-400">Salidas OUT ({detailedReport.movements.out_count} reg.)</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    -{detailedReport.movements.out_units} unid.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Detalle Valorizado de Inventario</h2>
              <button
                type="button"
                onClick={handlePrintDetailedReport}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                Imprimir / Guardar PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3">Categoría</th>
                    <th className="py-2 pr-3">P. Compra</th>
                    <th className="py-2 pr-3">P. Venta</th>
                    <th className="py-2 pr-3">Stock</th>
                    <th className="py-2">Valor Costo Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedReport.products.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-3 font-mono">{p.code}</td>
                      <td className="py-2 pr-3">{p.name}</td>
                      <td className="py-2 pr-3 text-slate-400">{p.category_name || '-'}</td>
                      <td className="py-2 pr-3">Bs {p.purchase_price}</td>
                      <td className="py-2 pr-3">Bs {p.sale_price}</td>
                      <td className="py-2 pr-3 font-semibold">{p.stock}</td>
                      <td className="py-2 font-semibold text-amber-300">Bs {p.inventory_cost_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && user?.role !== 'VENDEDOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreateUser} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-lg text-amber-300">Registrar Nuevo Usuario</h2>
            <input
              type="text"
              placeholder="Nombre completo"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              required
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                placeholder="Contraseña (mín. 6 caracteres)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
                required
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'ADMIN' | 'VENDEDOR')}
                className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm"
              >
                <option value="VENDEDOR">VENDEDOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm">
              Crear Usuario
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-amber-300">Usuarios del Sistema ({filteredUsers.length})</h2>
              <input
                type="text"
                placeholder="Buscar usuario o rol..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Correo</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-3">{u.name}</td>
                      <td className="py-2 pr-3 text-slate-300">{u.email}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-sky-950 text-sky-300 border border-sky-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-emerald-400">
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}





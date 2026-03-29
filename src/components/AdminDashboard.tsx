import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  ClipboardList, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Shield,
  Save,
  X,
  Truck,
  Image as ImageIcon,
  MapPin,
  Building2,
  CreditCard,
  Settings as SettingsIcon,
  Phone,
  MessageCircle,
  FileText
} from "lucide-react";
import { db, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, where, getDocs, handleFirestoreError, OperationType, setDoc, getDoc } from "../firebase";
import { Product, Showroom, BankDetails } from "../types";

interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  items: any[];
  total: string | number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'on-hold' | 'refunded' | 'failed';
  createdAt: string;
  billing?: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  line_items?: any[];
}

interface Employee {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  permissions?: {
    products: boolean;
    orders: boolean;
    banners: boolean;
    showrooms: boolean;
    settings: boolean;
    employees: boolean;
    shipping: boolean;
  };
}

interface AdminDashboardProps {
  userRole: string;
  userPermissions: Employee['permissions'] | null;
}

interface Banner {
  id: string;
  url: string;
  title?: string;
  subtitle?: string;
  link?: string;
  order: number;
  active: boolean;
}

export default function AdminDashboard({ userRole, userPermissions }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'employees' | 'shipping' | 'banners' | 'showrooms' | 'settings'>('orders');
  
  // Check permissions
  const hasPermission = (tab: string) => {
    if (userRole === 'admin') return true;
    if (!userPermissions) return userRole === 'manager' || userRole === 'staff';
    
    switch (tab) {
      case 'products': return userPermissions.products;
      case 'orders': return userPermissions.orders;
      case 'banners': return userPermissions.banners;
      case 'showrooms': return userPermissions.showrooms;
      case 'settings': return userPermissions.settings;
      case 'employees': return userPermissions.employees;
      case 'shipping': return userPermissions.shipping;
      default: return false;
    }
  };

  useEffect(() => {
    // If current tab is not allowed, switch to first allowed tab
    if (!hasPermission(activeTab)) {
      const tabs: ('products' | 'orders' | 'employees' | 'shipping' | 'banners' | 'showrooms' | 'settings')[] = 
        ['orders', 'products', 'employees', 'shipping', 'banners', 'showrooms', 'settings'];
      const firstAllowed = tabs.find(t => hasPermission(t));
      if (firstAllowed) setActiveTab(firstAllowed);
    }
  }, [userRole, userPermissions]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
  const [isEditingProduct, setIsEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState<any | null>(null);
  const [isAddingShipping, setIsAddingShipping] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState<Banner | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [isEditingShowroom, setIsEditingShowroom] = useState<Showroom | null>(null);
  const [isAddingShowroom, setIsAddingShowroom] = useState(false);
  const [isEditingBankAccount, setIsEditingBankAccount] = useState<BankDetails | null>(null);
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [isEditingEmployee, setIsEditingEmployee] = useState<Employee | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingType, setEditingType] = useState('simple');
  const [loading, setLoading] = useState(false);

  const fetchShippingMethods = async () => {
    try {
      const response = await fetch("/api/shipping/methods");
      const data = await response.json();
      setShippingMethods(data);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
    }
  };

  const fetchShippingZones = async () => {
    try {
      const response = await fetch("/api/shipping/zones");
      const data = await response.json();
      setShippingZones(data);
    } catch (error) {
      console.error("Error fetching shipping zones:", error);
    }
  };

  const createShippingMethod = async (zoneId: number, methodId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping/methods/${zoneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_id: methodId })
      });
      if (response.ok) {
        await fetchShippingMethods();
        setIsAddingShipping(false);
      } else {
        const err = await response.json();
        alert("فشل إضافة طريقة الشحن: " + (err.details?.message || err.error));
      }
    } catch (error) {
      console.error("Error creating shipping method:", error);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const updateShippingMethod = async (zoneId: number, instanceId: number, settings: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping/methods/${zoneId}/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settings
        })
      });
      if (response.ok) {
        await fetchShippingMethods();
        setIsEditingShipping(null);
      } else {
        const err = await response.json();
        alert("فشل تحديث طريقة الشحن: " + (err.details?.message || err.error));
      }
    } catch (error) {
      console.error("Error updating shipping method:", error);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const deleteShippingMethod = async (zoneId: number, instanceId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف طريقة الشحن هذه؟")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping/methods/${zoneId}/${instanceId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchShippingMethods();
      } else {
        const err = await response.json();
        alert("فشل حذف طريقة الشحن: " + (err.details?.message || err.error));
      }
    } catch (error) {
      console.error("Error deleting shipping method:", error);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?per_page=100");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders?per_page=50");
      const data = await response.json();
      if (Array.isArray(data)) {
        const mappedOrders: Order[] = data.map(o => ({
          id: o.id.toString(),
          customerName: `${o.billing.first_name} ${o.billing.last_name}`,
          customerEmail: o.billing.email,
          total: o.total,
          status: o.status,
          createdAt: o.date_created,
          billing: o.billing,
          items: o.line_items.map((li: any) => ({
            id: li.product_id,
            name: li.name,
            quantity: li.quantity,
            price: li.price,
            sku: li.sku,
            images: [] 
          })),
          line_items: o.line_items
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCategories();
    fetchShippingMethods();
    fetchShippingZones();

    // Listen to employees (users with roles)
    const usersRef = collection(db, "users");
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Employee));
      setEmployees(usersData.filter(u => u.role && u.role !== 'customer'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "users");
    });

    // Listen to banners
    const bannersRef = collection(db, "banners");
    const unsubBanners = onSnapshot(bannersRef, (snapshot) => {
      const bannersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(bannersData.sort((a, b) => a.order - b.order));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "banners");
    });

    return () => {
      unsubUsers();
      unsubBanners();
    };
  }, []);

  useEffect(() => {
    const showroomsRef = collection(db, "showrooms");
    const unsubShowrooms = onSnapshot(showroomsRef, (snapshot) => {
      const showroomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Showroom));
      setShowrooms(showroomsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "showrooms");
    });

    return () => unsubShowrooms();
  }, []);

  useEffect(() => {
    const bankAccountsRef = collection(db, "bank_accounts");
    const unsubBankAccounts = onSnapshot(bankAccountsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDetails));
      setBankAccounts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "bank_accounts");
    });

    return () => unsubBankAccounts();
  }, []);

  const handleSaveShowroom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const showroomData = {
      city: formData.get("city") as string,
      locationLink: formData.get("locationLink") as string,
      whatsapp: formData.get("whatsapp") as string,
      phone: formData.get("phone") as string,
      active: formData.get("active") === "on"
    };

    try {
      if (isEditingShowroom) {
        await updateDoc(doc(db, "showrooms", isEditingShowroom.id), showroomData);
      } else {
        await addDoc(collection(db, "showrooms"), showroomData);
      }
      setIsAddingShowroom(false);
      setIsEditingShowroom(null);
    } catch (error) {
      console.error("Error saving showroom:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShowroom = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المعرض؟")) return;
    try {
      await deleteDoc(doc(db, "showrooms", id));
    } catch (error) {
      console.error("Error deleting showroom:", error);
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const bankAccountData = {
      bankName: formData.get("bankName") as string,
      accountName: formData.get("accountName") as string,
      accountNumber: formData.get("accountNumber") as string,
      iban: formData.get("iban") as string,
      active: formData.get("active") === "on"
    };

    try {
      if (isEditingBankAccount) {
        await updateDoc(doc(db, "bank_accounts", isEditingBankAccount.id), bankAccountData);
      } else {
        await addDoc(collection(db, "bank_accounts"), { ...bankAccountData });
      }
      setIsAddingBankAccount(false);
      setIsEditingBankAccount(null);
      alert("تم حفظ بيانات البنك بنجاح");
    } catch (error) {
      console.error("Error saving bank details:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الحساب البنكي؟")) return;
    try {
      await deleteDoc(doc(db, "bank_accounts", id));
      alert("تم حذف الحساب بنجاح");
    } catch (error) {
      console.error("Error deleting bank account:", error);
      alert("حدث خطأ أثناء حذف الحساب");
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const bannerData = {
      url: formData.get('url') as string,
      title: formData.get('title') as string,
      subtitle: formData.get('subtitle') as string,
      link: formData.get('link') as string,
      order: parseInt(formData.get('order') as string) || 0,
      active: formData.get('active') === 'on',
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditingBanner) {
        await updateDoc(doc(db, "banners", isEditingBanner.id), bannerData);
      } else {
        await addDoc(collection(db, "banners"), {
          ...bannerData,
          createdAt: new Date().toISOString()
        });
      }
      setIsAddingBanner(false);
      setIsEditingBanner(null);
    } catch (error) {
      console.error("Error saving banner:", error);
      alert("حدث خطأ أثناء حفظ البنر");
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البنر؟")) return;
    try {
      await deleteDoc(doc(db, "banners", id));
    } catch (error) {
      console.error("Error deleting banner:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      // Update in WooCommerce
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        
        // Also try to update in Firestore if it exists there
        const q = query(collection(db, "orders"), where("wcOrderId", "==", parseInt(orderId)));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (docSnap) => {
          await updateDoc(doc(db, "orders", docSnap.id), { status: newStatus });
        });
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const productData: any = {
      name: formData.get('name') as string,
      regular_price: formData.get('price') as string,
      sale_price: formData.get('sale_price') as string,
      description: formData.get('description') as string,
      stock_status: formData.get('stock_status') as string,
      manage_stock: formData.get('manage_stock') === 'on',
      stock_quantity: formData.get('stock_quantity') ? parseInt(formData.get('stock_quantity') as string) : undefined,
      type: formData.get('type') as string,
      categories: [{ id: parseInt(formData.get('category') as string) }],
      images: formData.get('image_url') 
        ? [{ src: formData.get('image_url') as string }] 
        : (isEditingProduct?.images || [{ src: "https://picsum.photos/seed/safety/400" }]),
      status: "publish"
    };

    // Handle specific types
    if (productData.type === 'grouped') {
      const groupedIds = (formData.get('grouped_products') as string)
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      productData.grouped_products = groupedIds;
    }

    if (productData.type === 'external') {
      productData.external_url = formData.get('external_url') as string;
      productData.button_text = formData.get('button_text') as string;
    }

    try {
      let response;
      if (isEditingProduct) {
        response = await fetch(`/api/products/${isEditingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      } else {
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      }

      if (response.ok) {
        await fetchProducts();
        setIsAddingProduct(false);
        setIsEditingProduct(null);
      } else {
        const err = await response.json();
        alert("خطأ في حفظ المنتج: " + (err.details?.message || err.error));
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج من ووكومرس؟")) {
      try {
        const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (response.ok) {
          await fetchProducts();
        } else {
          alert("فشل حذف المنتج");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const updateEmployeeRole = async (uid: string, newRole: Employee['role']) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      alert("تم تحديث الصلاحية بنجاح");
    } catch (error) {
      console.error("Error updating role:", error);
      alert("حدث خطأ أثناء تحديث الصلاحية");
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const role = formData.get("role") as Employee['role'];
    
    const permissions = {
      products: formData.get("perm_products") === "on",
      orders: formData.get("perm_orders") === "on",
      banners: formData.get("perm_banners") === "on",
      showrooms: formData.get("perm_showrooms") === "on",
      settings: formData.get("perm_settings") === "on",
      employees: formData.get("perm_employees") === "on",
      shipping: formData.get("perm_shipping") === "on",
    };

    try {
      if (isEditingEmployee) {
        await updateDoc(doc(db, "users", isEditingEmployee.uid), {
          role,
          permissions
        });
      } else {
        // For new employees, we check if they already exist in users
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "users", userDoc.id), {
            role,
            permissions
          });
        } else {
          // If not, we create a placeholder document
          // App.tsx will pick this up on login
          await addDoc(collection(db, "users"), {
            email,
            role,
            permissions,
            displayName: "موظف جديد",
            isPending: true
          });
        }
      }
      setIsAddingEmployee(false);
      setIsEditingEmployee(null);
      alert("تم حفظ بيانات الموظف بنجاح");
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (uid: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    try {
      // Instead of deleting, we set role to customer
      await updateDoc(doc(db, "users", uid), { role: 'customer', permissions: null });
      alert("تم حذف الموظف بنجاح");
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("حدث خطأ أثناء حذف الموظف");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" dir="rtl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sticky top-32 shadow-sm">
            <h2 className="text-xl font-bold mb-6 px-4 flex items-center gap-2 text-red-700">
              <Shield size={24} /> لوحة التحكم
            </h2>
            <nav className="space-y-2">
              {hasPermission('orders') && (
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <ClipboardList size={20} />
                  <span className="font-bold">الطلبات</span>
                  <span className="mr-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">{orders.length}</span>
                </button>
              )}
              {hasPermission('products') && (
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <Package size={20} />
                  <span className="font-bold">المنتجات</span>
                </button>
              )}
              {hasPermission('employees') && (
                <button 
                  onClick={() => setActiveTab('employees')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'employees' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <Users size={20} />
                  <span className="font-bold">الموظفين</span>
                </button>
              )}
              {hasPermission('shipping') && (
                <button 
                  onClick={() => setActiveTab('shipping')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'shipping' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <Truck size={20} />
                  <span className="font-bold">إعدادات الشحن</span>
                </button>
              )}
              {hasPermission('banners') && (
                <button 
                  onClick={() => setActiveTab('banners')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'banners' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <ImageIcon size={20} />
                  <span className="font-bold">إدارة البنرات</span>
                </button>
              )}

              {hasPermission('showrooms') && (
                <button 
                  onClick={() => setActiveTab('showrooms')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'showrooms' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <Building2 size={20} />
                  <span className="font-bold">إدارة المعارض</span>
                </button>
              )}

              {hasPermission('settings') && (
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <SettingsIcon size={20} />
                  <span className="font-bold">إعدادات المتجر</span>
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">إدارة الطلبات</h3>
                  <button 
                    onClick={() => { setLoading(true); fetchOrders().finally(() => setLoading(false)); }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    title="تحديث الطلبات"
                  >
                    <Clock size={20} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-600">رقم الطلب</th>
                        <th className="px-6 py-4 font-bold text-gray-600">العميل</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الإجمالي</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الحالة</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm">#{order.id}</td>
                          <td className="px-6 py-4">{order.customerName}</td>
                          <td className="px-6 py-4 font-bold text-red-700">{order.total} ر.س</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              ['processing', 'on-hold'].includes(order.status) ? 'bg-blue-100 text-blue-700' :
                              ['cancelled', 'failed', 'refunded'].includes(order.status) ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status === 'completed' ? 'مكتمل' :
                               order.status === 'processing' ? 'قيد التنفيذ' :
                               order.status === 'on-hold' ? 'قيد الانتظار' :
                               order.status === 'cancelled' ? 'ملغي' : 
                               order.status === 'failed' ? 'فشل' :
                               order.status === 'refunded' ? 'مسترجع' : 'جديد'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => setSelectedOrder(order)} className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors" title="عرض التفاصيل"><ClipboardList size={18} /></button>
                              <button onClick={() => updateOrderStatus(order.id, 'processing')} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="قيد التنفيذ"><Clock size={18} /></button>
                              <button onClick={() => updateOrderStatus(order.id, 'completed')} className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors" title="مكتمل"><CheckCircle size={18} /></button>
                              <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="إلغاء"><XCircle size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">إدارة المنتجات</h3>
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={20} /> إضافة منتج
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <div key={product.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group">
                      <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-50">
                        <img src={product.images?.[0]?.src} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <h4 className="font-bold mb-2 line-clamp-1">{product.name}</h4>
                      <p className="text-red-700 font-black mb-4">{product.price} ر.س</p>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingProduct(product)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-bold text-sm">
                          <Edit2 size={16} /> تعديل
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'employees' && (
              <motion.div 
                key="employees"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">إدارة الموظفين والصلاحيات</h3>
                  <button 
                    onClick={() => setIsAddingEmployee(true)}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={20} /> إضافة موظف
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-600">الموظف</th>
                        <th className="px-6 py-4 font-bold text-gray-600">البريد الإلكتروني</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الصلاحية</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الصلاحيات المخصصة</th>
                        <th className="px-6 py-4 font-bold text-gray-600">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {employees.map(emp => (
                        <tr key={emp.uid} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold">{emp.displayName}</td>
                          <td className="px-6 py-4 text-gray-500">{emp.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              emp.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {emp.role === 'admin' ? 'مدير نظام' :
                               emp.role === 'manager' ? 'مدير متجر' : 'موظف'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {emp.permissions?.products && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold">المنتجات</span>}
                              {emp.permissions?.orders && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">الطلبات</span>}
                              {emp.permissions?.banners && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">البنرات</span>}
                              {emp.permissions?.showrooms && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">المعارض</span>}
                              {emp.permissions?.settings && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">الإعدادات</span>}
                              {emp.permissions?.employees && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold">الموظفين</span>}
                              {!emp.permissions && <span className="text-gray-400 text-[10px]">لا توجد صلاحيات مخصصة</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setIsEditingEmployee(emp)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteEmployee(emp.uid)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Employee Edit/Add Modal */}
                <AnimatePresence>
                  {(isAddingEmployee || isEditingEmployee) && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
                      >
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-bold">{isEditingEmployee ? 'تعديل الموظف' : 'إضافة موظف جديد'}</h3>
                          <button onClick={() => { setIsAddingEmployee(false); setIsEditingEmployee(null); }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSaveEmployee} className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">البريد الإلكتروني</label>
                            <input 
                              name="email"
                              type="email"
                              required
                              readOnly={!!isEditingEmployee}
                              defaultValue={isEditingEmployee?.email}
                              placeholder="example@gmail.com"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50" 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">الصلاحية العامة</label>
                            <select 
                              name="role"
                              defaultValue={isEditingEmployee?.role || 'staff'}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                            >
                              <option value="staff">موظف</option>
                              <option value="manager">مدير متجر</option>
                              <option value="admin">مدير نظام</option>
                            </select>
                          </div>

                          <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-600 block">الصلاحيات المخصصة</label>
                            <div className="grid grid-cols-2 gap-4">
                              {[
                                { id: 'products', label: 'إدارة المنتجات' },
                                { id: 'orders', label: 'إدارة الطلبات' },
                                { id: 'banners', label: 'إدارة البنرات' },
                                { id: 'showrooms', label: 'إدارة المعارض' },
                                { id: 'settings', label: 'إعدادات المتجر' },
                                { id: 'employees', label: 'إدارة الموظفين' },
                                { id: 'shipping', label: 'إعدادات الشحن' },
                              ].map(perm => (
                                <div key={perm.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                  <input 
                                    type="checkbox" 
                                    name={`perm_${perm.id}`} 
                                    id={`perm_${perm.id}`} 
                                    defaultChecked={isEditingEmployee?.permissions?.[perm.id as keyof typeof isEditingEmployee.permissions] ?? false}
                                    className="w-5 h-5 accent-red-600"
                                  />
                                  <label htmlFor={`perm_${perm.id}`} className="text-sm font-bold text-gray-700">{perm.label}</label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
                            {isEditingEmployee ? 'حفظ التغييرات' : 'إضافة الموظف'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
            {activeTab === 'banners' && (
              <motion.div 
                key="banners"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">إدارة بنرات الصفحة الرئيسية</h3>
                  <button 
                    onClick={() => setIsAddingBanner(true)}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={20} /> إضافة بنر
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {banners.map(banner => (
                    <div key={banner.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm group">
                      <div className="aspect-[21/9] relative overflow-hidden bg-gray-100">
                        <img 
                          src={banner.url} 
                          alt={banner.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {!banner.active && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-xs font-bold">غير نشط</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold mb-1">{banner.title || "بدون عنوان"}</h4>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-1">{banner.subtitle || "بدون وصف"}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-mono">الترتيب: {banner.order}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsEditingBanner(banner)}
                              className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => deleteBanner(banner.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {banners.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                      <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">لا توجد بنرات حالياً. أضف بنر جديد للبدء.</p>
                    </div>
                  )}
                </div>

                {/* Banner Edit/Add Modal */}
                <AnimatePresence>
                  {(isAddingBanner || isEditingBanner) && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
                      >
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-bold">{isEditingBanner ? 'تعديل البنر' : 'إضافة بنر جديد'}</h3>
                          <button onClick={() => { setIsAddingBanner(false); setIsEditingBanner(null); }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSaveBanner} className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">رابط الصورة</label>
                            <input 
                              name="url"
                              required
                              defaultValue={isEditingBanner?.url}
                              placeholder="https://example.com/image.jpg"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">العنوان الرئيسي (اختياري)</label>
                              <input 
                                name="title"
                                defaultValue={isEditingBanner?.title}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">العنوان الفرعي (اختياري)</label>
                              <input 
                                name="subtitle"
                                defaultValue={isEditingBanner?.subtitle}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">رابط التوجيه (اختياري)</label>
                              <input 
                                name="link"
                                defaultValue={isEditingBanner?.link}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">الترتيب</label>
                              <input 
                                name="order"
                                type="number"
                                defaultValue={isEditingBanner?.order || 0}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                            <input 
                              type="checkbox" 
                              name="active" 
                              id="active" 
                              defaultChecked={isEditingBanner ? isEditingBanner.active : true}
                              className="w-5 h-5 accent-red-600"
                            />
                            <label htmlFor="active" className="font-bold text-gray-700">تفعيل البنر</label>
                          </div>

                          <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
                            {isEditingBanner ? 'حفظ التغييرات' : 'إضافة البنر'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'shipping' && (
              <motion.div 
                key="shipping"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">إعدادات الشحن</h3>
                  <button 
                    onClick={() => setIsAddingShipping(true)}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={20} /> إضافة طريقة شحن
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {shippingZones.map(zone => (
                    <div key={zone.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">{zone.name}</h4>
                          <p className="text-sm text-gray-500">المناطق: {zone.formatted_location || "جميع المناطق"}</p>
                        </div>
                        <button 
                          onClick={() => { setIsAddingShipping(zone.id); }}
                          className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
                        >
                          <Plus size={18} /> إضافة طريقة
                        </button>
                      </div>

                      <div className="space-y-4">
                        {shippingMethods.filter(m => m.zone_id === zone.id).map(method => (
                          <div key={method.instance_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                                <Truck size={24} />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-800">{method.title}</h5>
                                <p className="text-sm text-gray-500">
                                  {method.method_id === 'flat_rate' ? `سعر ثابت: ${method.settings?.cost?.value || 0} ر.س` : 
                                   method.method_id === 'free_shipping' ? 'شحن مجاني' : 'استلام من المعرض'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setIsEditingShipping(method)}
                                className="p-2 hover:bg-white text-gray-600 rounded-lg transition-colors shadow-sm"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => deleteShippingMethod(zone.id, method.instance_id)}
                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {shippingMethods.filter(m => m.zone_id === zone.id).length === 0 && (
                          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                            لا توجد طرق شحن لهذه المنطقة
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Modal */}
                <AnimatePresence>
                  {(isAddingShipping || isEditingShipping) && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
                      >
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-bold">{isEditingShipping ? 'تعديل طريقة الشحن' : 'إضافة طريقة شحن'}</h3>
                          <button onClick={() => { setIsAddingShipping(false); setIsEditingShipping(null); }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          if (isEditingShipping) {
                            const cost = formData.get('cost') as string;
                            updateShippingMethod(isEditingShipping.zone_id, isEditingShipping.instance_id, {
                              cost: cost
                            });
                          } else {
                            const zoneId = typeof isAddingShipping === 'number' ? isAddingShipping : shippingZones[0]?.id;
                            const methodId = formData.get('method_id') as string;
                            createShippingMethod(zoneId, methodId);
                          }
                        }} className="space-y-6">
                          {!isEditingShipping && (
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">نوع الشحن</label>
                              <select 
                                name="method_id"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                              >
                                <option value="flat_rate">سعر ثابت</option>
                                <option value="free_shipping">شحن مجاني</option>
                                <option value="local_pickup">استلام من المعرض</option>
                              </select>
                            </div>
                          )}

                          {(isEditingShipping?.method_id === 'flat_rate' || (!isEditingShipping)) && (
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-600">التكلفة (ر.س)</label>
                              <input 
                                name="cost"
                                type="number"
                                required
                                defaultValue={isEditingShipping?.settings?.cost?.value || 0}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                              />
                            </div>
                          )}

                          <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
                            {isEditingShipping ? 'حفظ التغييرات' : 'إضافة الطريقة'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'showrooms' && (
              <motion.div 
                key="showrooms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">إدارة المعارض</h2>
                  <button 
                    onClick={() => setIsAddingShowroom(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all"
                  >
                    <Plus size={20} /> إضافة معرض
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {showrooms.map(showroom => (
                    <div key={showroom.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-red-50 p-3 rounded-2xl">
                          <Building2 className="text-red-600" size={24} />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsEditingShowroom(showroom)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteShowroom(showroom.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{showroom.city}</h3>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Phone size={14} /> {showroom.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle size={14} /> {showroom.whatsapp}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} /> 
                          <a href={showroom.locationLink} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                            رابط الموقع
                          </a>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">الحالة</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${showroom.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {showroom.active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">إعدادات المتجر</h2>
                  <button 
                    onClick={() => setIsAddingBankAccount(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    <Plus size={20} /> إضافة حساب بنكي
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bankAccounts.map(account => (
                    <div key={account.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-50 p-2 rounded-xl">
                            <CreditCard className="text-red-600" size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold">{account.bankName}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${account.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                              {account.active ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsEditingBankAccount(account)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBankAccount(account.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">اسم الحساب:</span>
                          <span className="font-bold">{account.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">رقم الحساب:</span>
                          <span className="font-bold font-mono">{account.accountNumber}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-50">
                          <span className="text-gray-400 block mb-1">الآيبان (IBAN):</span>
                          <span className="font-bold font-mono text-xs break-all">{account.iban}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {bankAccounts.length === 0 && (
                  <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center">
                    <CreditCard size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-500">لا يوجد حسابات بنكية مضافة حالياً</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Showroom Modal */}
      <AnimatePresence>
        {(isAddingShowroom || isEditingShowroom) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">{isEditingShowroom ? 'تعديل معرض' : 'إضافة معرض جديد'}</h2>
                <button onClick={() => { setIsAddingShowroom(false); setIsEditingShowroom(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveShowroom} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">المدينة</label>
                  <input 
                    name="city"
                    defaultValue={isEditingShowroom?.city}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="مثال: الرياض"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">رابط الموقع (Google Maps)</label>
                  <input 
                    name="locationLink"
                    defaultValue={isEditingShowroom?.locationLink}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="أدخل رابط الموقع"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500">رقم الواتساب</label>
                    <input 
                      name="whatsapp"
                      defaultValue={isEditingShowroom?.whatsapp}
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      placeholder="966500000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500">رقم الاتصال</label>
                    <input 
                      name="phone"
                      defaultValue={isEditingShowroom?.phone}
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      placeholder="0110000000"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    name="active"
                    id="active-showroom"
                    defaultChecked={isEditingShowroom ? isEditingShowroom.active : true}
                    className="w-5 h-5 accent-red-600"
                  />
                  <label htmlFor="active-showroom" className="text-sm font-bold text-gray-700">تفعيل المعرض</label>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
                  {isEditingShowroom ? 'حفظ التعديلات' : 'إضافة المعرض'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bank Account Modal */}
      <AnimatePresence>
        {(isAddingBankAccount || isEditingBankAccount) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">
                  {isEditingBankAccount ? "تعديل حساب بنكي" : "إضافة حساب بنكي جديد"}
                </h2>
                <button 
                  onClick={() => { setIsAddingBankAccount(false); setIsEditingBankAccount(null); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveBankAccount} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">اسم البنك</label>
                  <input 
                    name="bankName"
                    type="text" 
                    required
                    defaultValue={isEditingBankAccount?.bankName}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    placeholder="مثال: مصرف الراجحي"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">اسم الحساب</label>
                  <input 
                    name="accountName"
                    type="text" 
                    required
                    defaultValue={isEditingBankAccount?.accountName}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    placeholder="اسم صاحب الحساب"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">رقم الحساب</label>
                    <input 
                      name="accountNumber"
                      type="text" 
                      required
                      defaultValue={isEditingBankAccount?.accountNumber}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">الآيبان (IBAN)</label>
                    <input 
                      name="iban"
                      type="text" 
                      required
                      defaultValue={isEditingBankAccount?.iban}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    name="active" 
                    id="bank-active"
                    defaultChecked={isEditingBankAccount ? isEditingBankAccount.active : true}
                    className="w-5 h-5 accent-red-600"
                  />
                  <label htmlFor="bank-active" className="text-sm font-bold text-gray-700">تفعيل الحساب</label>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
                  حفظ الحساب
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">تفاصيل الطلب #{selectedOrder.id}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">معلومات العميل</h4>
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                    <p className="font-bold text-lg">{selectedOrder.customerName}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-bold">البريد:</span> {selectedOrder.customerEmail || 'غير متوفر'}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-bold">الهاتف:</span> {selectedOrder.billing?.phone || 'غير متوفر'}
                    </p>
                    <div className="text-sm text-gray-600 pt-2 border-t border-gray-200 mt-2">
                      <p className="font-bold mb-1">العنوان:</p>
                      <p>{selectedOrder.billing?.address_1}</p>
                      <p>{selectedOrder.billing?.city}, {selectedOrder.billing?.state} {selectedOrder.billing?.postcode}</p>
                    </div>
                    <p className="text-xs text-gray-400 pt-2">{new Date(selectedOrder.createdAt).toLocaleString('ar-SA')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">حالة الطلب والمالية</h4>
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-500">الحالة الحالية:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700' :
                        ['processing', 'on-hold'].includes(selectedOrder.status) ? 'bg-blue-100 text-blue-700' :
                        ['cancelled', 'failed', 'refunded'].includes(selectedOrder.status) ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedOrder.status === 'completed' ? 'مكتمل' :
                         selectedOrder.status === 'processing' ? 'قيد التنفيذ' :
                         selectedOrder.status === 'on-hold' ? 'قيد الانتظار' :
                         selectedOrder.status === 'cancelled' ? 'ملغي' : 
                         selectedOrder.status === 'failed' ? 'فشل' :
                         selectedOrder.status === 'refunded' ? 'مسترجع' : 'جديد'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 block">تغيير الحالة:</label>
                      <select 
                        value={selectedOrder.status}
                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as any)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="pending">قيد الانتظار (Pending)</option>
                        <option value="processing">قيد التنفيذ (Processing)</option>
                        <option value="on-hold">في الانتظار (On Hold)</option>
                        <option value="completed">مكتمل (Completed)</option>
                        <option value="cancelled">ملغي (Cancelled)</option>
                        <option value="refunded">مسترجع (Refunded)</option>
                        <option value="failed">فشل (Failed)</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="font-bold text-gray-500">الإجمالي:</span>
                      <span className="text-2xl font-black text-red-700">{selectedOrder.total} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">المنتجات المطلوبة ({selectedOrder.items.length})</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {item.images?.[0]?.src ? (
                          <img src={item.images[0].src} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <div className="flex gap-4 mt-1">
                          <p className="text-xs text-gray-500">الكمية: <span className="font-bold text-gray-700">{item.quantity}</span></p>
                          <p className="text-xs text-gray-500">السعر: <span className="font-bold text-gray-700">{item.price} ر.س</span></p>
                          {item.sku && <p className="text-xs text-gray-500">SKU: <span className="font-bold text-gray-700">{item.sku}</span></p>}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-red-700">{(item.quantity * parseFloat(item.price)).toFixed(2)} ر.س</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Order Info */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedOrder.isCompany && selectedOrder.companyInfo && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">بيانات الشركة</h4>
                    <div className="bg-blue-50 p-4 rounded-2xl space-y-2 text-sm">
                      <p><span className="font-bold text-blue-800">اسم الشركة:</span> {selectedOrder.companyInfo.name}</p>
                      <p><span className="font-bold text-blue-800">الرقم الضريبي:</span> {selectedOrder.companyInfo.taxNumber}</p>
                      <p><span className="font-bold text-blue-800">السجل التجاري:</span> {selectedOrder.companyInfo.commercialRegister}</p>
                    </div>
                  </div>
                )}

                {selectedOrder.pickupShowroom && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">استلام من المعرض</h4>
                    <div className="bg-orange-50 p-4 rounded-2xl space-y-2 text-sm">
                      <p className="font-bold text-orange-800">{selectedOrder.pickupShowroom.city}</p>
                      <div className="flex gap-4 mt-2">
                        <a href={selectedOrder.pickupShowroom.locationLink} target="_blank" rel="noopener noreferrer" className="text-red-600 font-bold flex items-center gap-1">
                          <MapPin size={14} /> الموقع
                        </a>
                        <a href={`tel:${selectedOrder.pickupShowroom.phone}`} className="text-gray-600 font-bold flex items-center gap-1">
                          <Phone size={14} /> اتصال
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.payment_method === 'bank_transfer' && selectedOrder.bankTransferInfo && (
                  <div className="md:col-span-2 space-y-3">
                    <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider">بيانات التحويل البنكي</h4>
                    <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-sm"><span className="font-bold text-green-800">المحول إليه:</span> {selectedOrder.bankTransferInfo.bankAccount?.bankName}</p>
                          <p className="text-sm"><span className="font-bold text-green-800">اسم المحول:</span> {selectedOrder.bankTransferInfo.holderName}</p>
                          {selectedOrder.bankTransferInfo.receiptUrl && (
                            <div className="mt-4">
                              <p className="text-xs font-bold text-green-800 mb-2">إيصال التحويل:</p>
                              {selectedOrder.bankTransferInfo.receiptUrl.startsWith('data:application/pdf') ? (
                                <a 
                                  href={selectedOrder.bankTransferInfo.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-green-700 border border-green-200"
                                >
                                  <FileText size={16} /> عرض ملف PDF
                                </a>
                              ) : (
                                <div className="relative group">
                                  <img 
                                    src={selectedOrder.bankTransferInfo.receiptUrl} 
                                    className="w-full max-w-[200px] rounded-xl border border-green-200 cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => window.open(selectedOrder.bankTransferInfo.receiptUrl, '_blank')}
                                    alt="إيصال التحويل"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    <div className="bg-black/50 text-white px-3 py-1 rounded-full text-[10px]">اضغط للتكبير</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="bg-white/50 p-4 rounded-2xl border border-green-100 text-xs space-y-2">
                          <p className="font-bold text-green-800 border-b border-green-100 pb-2 mb-2">تفاصيل الحساب المحول إليه</p>
                          <p><span className="text-gray-500">اسم الحساب:</span> {selectedOrder.bankTransferInfo.bankAccount?.accountName}</p>
                          <p><span className="text-gray-500">رقم الحساب:</span> {selectedOrder.bankTransferInfo.bankAccount?.accountNumber}</p>
                          <p><span className="text-gray-500">الآيبان:</span> {selectedOrder.bankTransferInfo.bankAccount?.iban}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t flex gap-3">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {(isAddingProduct || isEditingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative"
            >
              <button 
                onClick={() => { setIsAddingProduct(false); setIsEditingProduct(null); }}
                className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-8">{isEditingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
              
              <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">اسم المنتج</label>
                    <input name="name" defaultValue={isEditingProduct?.name} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">السعر (ر.س)</label>
                    <input name="price" type="number" defaultValue={isEditingProduct?.price || isEditingProduct?.regular_price} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">سعر العرض (اختياري)</label>
                    <input name="sale_price" type="number" defaultValue={isEditingProduct?.sale_price} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">رابط صورة المنتج</label>
                  <input name="image_url" defaultValue={isEditingProduct?.images?.[0]?.src} placeholder="https://example.com/image.jpg" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">نوع المنتج</label>
                    <select 
                      name="type" 
                      defaultValue={isEditingProduct?.type || 'simple'} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                      onChange={(e) => setEditingType(e.target.value)}
                    >
                      <option value="simple">بسيط (Simple)</option>
                      <option value="variable">متعدد الخصائص (Variable)</option>
                      <option value="grouped">مجمع (Grouped)</option>
                      <option value="external">خارجي (External)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">التصنيف</label>
                    <select name="category" defaultValue={isEditingProduct?.categories?.[0]?.id} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none">
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Fields based on Type */}
                {editingType === 'grouped' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">معرفات المنتجات المجمعة (مفصولة بفاصلة)</label>
                    <input 
                      name="grouped_products" 
                      defaultValue={isEditingProduct?.grouped_products?.join(',')} 
                      placeholder="مثال: 12, 45, 67"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                    />
                  </div>
                )}

                {editingType === 'external' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">رابط المنتج الخارجي</label>
                      <input name="external_url" defaultValue={isEditingProduct?.external_url} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">نص الزر</label>
                      <input name="button_text" defaultValue={isEditingProduct?.button_text} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">الوصف</label>
                  <textarea name="description" defaultValue={isEditingProduct?.description?.replace(/<[^>]*>/g, '')} rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">حالة المخزون</label>
                    <select name="stock_status" defaultValue={isEditingProduct?.stock_status || 'instock'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none">
                      <option value="instock">متوفر</option>
                      <option value="outofstock">نفذت الكمية</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">إدارة المخزون</label>
                    <div className="flex items-center gap-4 mt-3">
                      <input type="checkbox" name="manage_stock" defaultChecked={isEditingProduct?.manage_stock} className="w-5 h-5 accent-red-600" />
                      <input name="stock_quantity" type="number" placeholder="الكمية" defaultValue={isEditingProduct?.stock_quantity} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}
                  {isEditingProduct ? 'تحديث في ووكومرس' : 'إضافة إلى ووكومرس'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

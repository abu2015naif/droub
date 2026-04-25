/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, 
  ShoppingBag,
  Search, 
  Menu, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  ShieldCheck,
  Flame,
  Truck,
  AlertCircle,
  Building2,
  Clock,
  ArrowRight,
  Filter,
  Heart,
  User,
  LogOut,
  LayoutDashboard,
  CreditCard,
  Home,
  Grid,
  MessageCircle,
  Upload,
  AlertTriangle
} from "lucide-react";
import { SAMPLE_PRODUCTS, SAMPLE_CATEGORIES } from "./constants";
import { Product, Category, CartItem, Banner, Showroom, BankDetails } from "./types";
import { auth, db, googleProvider, signInWithPopup, signOut, doc, setDoc, deleteDoc, onSnapshot, collection, getDoc, addDoc, handleFirestoreError, OperationType, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, query, where, getDocs, orderBy, RecaptchaVerifier, signInWithPhoneNumber } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recentlyViewed");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  // Save recentlyViewed to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  const addToRecentlyViewed = (product: Product) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 10); // Keep last 10
    });
  };

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  const [isUsingSampleCategories, setIsUsingSampleCategories] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "shop" | "admin" | "checkout" | "profile">("home");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>("customer");
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favorites");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
  const [homeSettings, setHomeSettings] = useState<{ productsPerPage: number }>({ productsPerPage: 8 });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<any[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const homeSettingsRef = doc(db, "settings", "home");
    const unsubHomeSettings = onSnapshot(homeSettingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setHomeSettings(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/home");
    });

    return () => unsubHomeSettings();
  }, []);

  useEffect(() => {
    const isFeatured = (p: any) => p.featured === true || String(p.featured) === "true" || (p.featured as any) === 1 || String(p.featured) === "1";
    
    const fetchFeatured = async () => {
      try {
        const res = await fetch("/api/products?featured=true&per_page=20");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const processedData = data.map(p => ({
              ...p,
              featured: isFeatured(p)
            }));
            setFeaturedProducts(processedData);
          }
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const fetchPaymentGateways = async () => {
      setLoadingGateways(true);
      try {
        const res = await fetch("/api/payment-gateways");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setPaymentGateways(data);
          }
        }
      } catch (error) {
        console.error("Error fetching payment gateways:", error);
      } finally {
        setLoadingGateways(false);
      }
    };
    fetchPaymentGateways();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && activeTab === "shop") {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, activeTab, page]); // Re-bind when these change

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check/Set user in Firestore
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Check if there's a pending employee with this email
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", u.email), where("isPending", "==", true));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const pendingDoc = querySnapshot.docs[0];
            const pendingData = pendingDoc.data();
            
            // Migrate pending doc to use UID as ID
            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || pendingData.displayName,
              photoURL: u.photoURL,
              role: pendingData.role,
              permissions: pendingData.permissions || null
            });
            
            // Delete the pending doc
            await deleteDoc(doc(db, "users", pendingDoc.id));
            
            setUserRole(pendingData.role);
            setUserPermissions(pendingData.permissions || null);
          } else {
            const isFirstUser = u.email === "abu2015naif@gmail.com";
            const role = isFirstUser ? "admin" : "customer";
            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              role: role
            });
            setUserRole(role);
            setUserPermissions(null);
          }
        } else {
          const data = userSnap.data();
          setUserRole(data.role || "customer");
          setUserPermissions(data.permissions || null);
        }

        // Fetch favorites
        const favsRef = collection(db, `users/${u.uid}/favorites`);
        return onSnapshot(favsRef, (snapshot) => {
          const favIds = snapshot.docs.map(doc => parseInt(doc.id));
          setFavorites(favIds);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}/favorites`);
        });
      } else {
        setFavorites([]);
        setUserRole("customer");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const bannersRef = collection(db, "banners");
    const unsubBanners = onSnapshot(bannersRef, (snapshot) => {
      const bannersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Banner))
        .filter(b => b.active)
        .sort((a, b) => a.order - b.order);
      setBanners(bannersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "banners");
    });

    return () => unsubBanners();
  }, []);

  useEffect(() => {
    const showroomsRef = collection(db, "showrooms");
    const unsubShowrooms = onSnapshot(showroomsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Showroom));
      setShowrooms(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "showrooms");
    });

    const bankAccountsRef = collection(db, "bank_accounts");
    const unsubBankAccounts = onSnapshot(bankAccountsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDetails));
      setBankAccounts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "bank_accounts");
    });

    return () => {
      unsubShowrooms();
      unsubBankAccounts();
    };
  }, []);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const fetchProducts = async (pageNum: number, categoryId: number | null, search: string, append: boolean = false, orderby: string = sortBy, order: string = sortOrder) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        per_page: "20",
        orderby: orderby,
        order: order
      });
      if (categoryId) params.append("category", categoryId.toString());
      if (search) params.append("search", search);

      console.log(`📡 Fetching products: page=${pageNum}, category=${categoryId || 'all'}, search=${search || 'none'}`);
      const res = await fetch(`/api/products?${params.toString()}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ API Error fetching products:", errorData);
        throw new Error(errorData.error || "Failed to fetch products");
      }

      const data = await res.json();
      console.log(`✅ Received ${Array.isArray(data) ? data.length : 0} products from API`);
      
      if (Array.isArray(data) && data.length > 0) {
        if (append) {
          setProducts(prev => [...prev, ...data]);
        } else {
          setProducts(data);
        }
        setHasMore(data.length === 20);
        setIsUsingSampleData(false);
      } else {
        if (!append && !categoryId && !search) {
          setProducts(SAMPLE_PRODUCTS);
          setIsUsingSampleData(true);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      if (!append && !selectedCategory && !searchQuery) {
        setProducts(SAMPLE_PRODUCTS);
        setIsUsingSampleData(true);
      } else if (!append) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setIsUsingSampleCategories(false);
        } else {
          setCategories(SAMPLE_CATEGORIES);
          setIsUsingSampleCategories(true);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories(SAMPLE_CATEGORIES);
        setIsUsingSampleCategories(true);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, selectedCategory, searchQuery, false, sortBy, sortOrder);
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, selectedCategory, searchQuery, true, sortBy, sortOrder);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!isUsingSampleData) return products;
    
    const sorted = [...products];
    if (sortBy === "price") {
      sorted.sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
      });
    } else if (sortBy === "date") {
      sorted.sort((a, b) => {
        const dateA = new Date(a.date_created || "").getTime();
        const dateB = new Date(b.date_created || "").getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    }
    return sorted;
  }, [products, isUsingSampleData, sortBy, sortOrder]);

  const addToCart = (product: Product, selectedAttributes?: { [key: string]: string }) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedAttributes || {}) === JSON.stringify(selectedAttributes || {})
      );
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && JSON.stringify(item.selectedAttributes || {}) === JSON.stringify(selectedAttributes || {}))
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedAttributes }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number, selectedAttributes?: { [key: string]: string }) => {
    setCart(prev => prev.filter(item => 
      !(item.id === productId && JSON.stringify(item.selectedAttributes || {}) === JSON.stringify(selectedAttributes || {}))
    ));
  };

  const updateQuantity = (productId: number, delta: number, selectedAttributes?: { [key: string]: string }) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId && JSON.stringify(item.selectedAttributes || {}) === JSON.stringify(selectedAttributes || {})) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  const toggleFavorite = async (productId: number) => {
    if (!user) {
      setFavorites(prev => {
        if (prev.includes(productId)) {
          return prev.filter(id => id !== productId);
        }
        return [...prev, productId];
      });
      return;
    }

    const favRef = doc(db, `users/${user.uid}/favorites`, productId.toString());
    if (favorites.includes(productId)) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, {
        productId,
        addedAt: new Date().toISOString()
      });
    }
  };

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab("home");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    if (cart.length === 0) return;
    
    // Fetch shipping methods
    try {
      const res = await fetch("/api/shipping/methods");
      const data = await res.json();
      setShippingMethods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
    }

    setIsCartOpen(false);
    setActiveTab("checkout");
  };

  const finalizeOrder = async (shippingDetails: any, selectedShipping: any, paymentMethod: string = "cod", extraData?: any) => {
    setCheckoutLoading(true);
    let currentUser = user;

    try {
      // 1. Automatic Registration if not logged in
      if (!currentUser) {
        try {
          // Generate a random password for the new user
          const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";
          const userCredential = await createUserWithEmailAndPassword(auth, shippingDetails.email, tempPassword);
          currentUser = userCredential.user;
          
          // Send password reset email so they can set their own password
          await sendPasswordResetEmail(auth, shippingDetails.email);
          console.log("Auto-registered user and sent reset email");
        } catch (authError: any) {
          // If user already exists, we proceed as guest or inform them
          if (authError.code === 'auth/email-already-in-use') {
            console.log("User already exists, proceeding with order linked to email");
            // We can't log them in without password, but we can still create the WC order
          } else {
            throw authError;
          }
        }
      }

      const shippingCost = parseFloat(selectedShipping?.settings?.cost?.value || "0");
      const totalAmount = cartTotal + shippingCost;
      console.log("💰 Order Total Calculation:", { cartTotal, shippingCost, totalAmount });

      // 1. Create order in WooCommerce via our backend
      const wcOrderData = {
        payment_method: paymentMethod,
        payment_method_title: paymentMethod === "cod" ? "الدفع عند الاستلام" : 
                             paymentMethod === "bank_transfer" ? "حوالة بنكية" :
                             paymentMethod.toLowerCase().includes("applepay") ? "Apple Pay" :
                             paymentMethod.toLowerCase().includes("tamara") ? "تمارا (Tamara)" :
                             "بطاقة مدى / فيزا / ماستر كارد",
        set_paid: false,
        customer_note: extraData?.isCompany ? `طلب لشركة: ${extraData.companyInfo?.name || ""} - ضريبي: ${extraData.companyInfo?.taxNumber || ""} - سجل: ${extraData.companyInfo?.commercialRegister || ""}` : "",
        billing: {
          first_name: shippingDetails.firstName || "",
          last_name: shippingDetails.lastName || "",
          address_1: shippingDetails.address || "",
          city: shippingDetails.city || "",
          state: shippingDetails.state || "Riyadh",
          postcode: shippingDetails.postcode || "12345",
          country: "SA",
          email: currentUser?.email || shippingDetails.email || "",
          phone: shippingDetails.phone || ""
        },
        line_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          meta_data: item.selectedAttributes ? Object.entries(item.selectedAttributes).map(([key, value]) => ({
            key,
            value: value || ""
          })) : []
        })),
        shipping_lines: selectedShipping ? [
          {
            method_id: selectedShipping.method_id,
            method_title: selectedShipping.method_title,
            total: shippingCost.toFixed(2)
          }
        ] : []
      };

      const wcResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wcOrderData)
      });

      if (!wcResponse.ok) {
        const errorData = await wcResponse.json();
        console.error("❌ WooCommerce Order Creation Failed:", errorData);
        throw new Error("Failed to sync with WooCommerce");
      }

      const wcOrder = await wcResponse.json();
      console.log("✅ WooCommerce Order Created:", wcOrder);

      // 2. Also save to Firestore for local tracking
      await addDoc(collection(db, "orders"), {
        userId: currentUser?.uid || "guest",
        customerName: `${shippingDetails.firstName || ""} ${shippingDetails.lastName || ""}`.trim() || "عميل",
        customerEmail: currentUser?.email || shippingDetails.email || "",
        items: cart.map(item => ({
          id: item.id || 0,
          name: item.name || "",
          price: item.price || 0,
          quantity: item.quantity || 0,
          image: item.images?.[0]?.src || item.image || "",
          selectedAttributes: item.selectedAttributes ? JSON.parse(JSON.stringify(item.selectedAttributes)) : null
        })),
        total: parseFloat(wcOrder.total || totalAmount.toString()) || totalAmount,
        status: 'pending',
        wcOrderId: wcOrder.id || 0,
        billing: JSON.parse(JSON.stringify(wcOrderData.billing)),
        payment_method: paymentMethod,
        payment_method_title: wcOrderData.payment_method_title,
        isCompany: extraData?.isCompany || false,
        companyInfo: extraData?.companyInfo ? JSON.parse(JSON.stringify(extraData.companyInfo)) : null,
        pickupShowroom: extraData?.pickupShowroom ? JSON.parse(JSON.stringify(extraData.pickupShowroom)) : null,
        bankTransferInfo: extraData?.bankTransferInfo ? JSON.parse(JSON.stringify(extraData.bankTransferInfo)) : null,
        createdAt: new Date().toISOString()
      });

      if (paymentMethod.toLowerCase().includes("tamara")) {
        try {
          const wcTotal = wcOrder.total;
          const paymentAmount = (wcTotal && parseFloat(wcTotal) > 0) ? wcTotal : totalAmount.toFixed(2);
          
          console.log("🚀 Initiating Tamara payment:", { 
            orderId: wcOrder.id, 
            amount: paymentAmount,
            wcTotal: wcTotal,
            localTotal: totalAmount.toFixed(2)
          });
          
          const tamaraResponse = await fetch("/api/payment/tamara/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: wcOrder.id,
              amount: paymentAmount,
              currency: wcOrder.currency || "SAR",
              customer: {
                firstName: shippingDetails.firstName,
                lastName: shippingDetails.lastName,
                email: currentUser?.email || shippingDetails.email,
                phone: shippingDetails.phone,
                address: shippingDetails.address,
                city: shippingDetails.city
              },
              items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                sku: item.sku || item.id.toString()
              })),
              shippingAmount: shippingCost.toFixed(2),
              returnUrl: `${window.location.origin}?payment=success&order_id=${wcOrder.id}`,
              cancelUrl: `${window.location.origin}?payment=cancel&order_id=${wcOrder.id}`
            })
          });

          if (!tamaraResponse.ok) {
            const errorData = await tamaraResponse.json();
            console.error("❌ Tamara Payment Initiation Failed:", errorData);
            throw new Error(errorData.message || errorData.error || "Failed to initiate Tamara payment");
          }

          const tamaraResult = await tamaraResponse.json();
          if (tamaraResult.url) {
            console.log("🚀 Redirecting to Tamara checkout:", tamaraResult.url);
            window.location.href = tamaraResult.url;
            return;
          }
        } catch (tamaraError: any) {
          console.error("❌ Tamara Error:", tamaraError);
          alert("عذراً، فشل بدء عملية الدفع عبر تمارا. يرجى المحاولة مرة أخرى أو اختيار وسيلة دفع أخرى.");
          setCheckoutLoading(false);
          return;
        }
      }

      if (paymentMethod.toLowerCase().includes("telr") || paymentMethod.toLowerCase().includes("applepay")) {
        try {
          // Fix: If WooCommerce returns '0' as total, use our locally calculated totalAmount
          const wcTotal = wcOrder.total;
          const paymentAmount = (wcTotal && parseFloat(wcTotal) > 0) ? wcTotal : totalAmount.toFixed(2);
          
          console.log("🚀 Initiating Telr payment:", { 
            orderId: wcOrder.id, 
            amount: paymentAmount,
            wcTotal: wcTotal,
            localTotal: totalAmount.toFixed(2)
          });
          
          const telrResponse = await fetch("/api/payment/telr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: wcOrder.id,
              amount: paymentAmount,
              currency: wcOrder.currency || "SAR",
              customer: {
                firstName: shippingDetails.firstName,
                lastName: shippingDetails.lastName,
                email: currentUser?.email || shippingDetails.email,
                phone: shippingDetails.phone,
                address: shippingDetails.address,
                city: shippingDetails.city
              },
              returnUrl: `${window.location.origin}?payment=success&order_id=${wcOrder.id}`,
              cancelUrl: `${window.location.origin}?payment=cancel&order_id=${wcOrder.id}`,
              payMethod: "creditcard"
            })
          });

          const telrData = await telrResponse.json();
          
          if (!telrResponse.ok) {
            throw new Error(telrData.error || "Failed to initiate Telr payment");
          }

          if (telrData.url) {
            console.log("Redirecting directly to Telr gateway:", telrData.url);
            window.location.href = telrData.url;
            return;
          } else {
            throw new Error("No payment URL received from Telr");
          }
        } catch (telrError: any) {
          console.error("Telr direct initiation failed:", telrError);
          alert(`خطأ في بوابة الدفع: ${telrError.message}`);
          return;
        }
      }

      // 4. Handle standard WooCommerce payment redirects (FALLBACK ONLY)
      // This is a fallback if custom integrations above weren't triggered
      if (wcOrder.payment_url || wcOrder.checkout_payment_url) {
        const redirectUrl = wcOrder.payment_url || wcOrder.checkout_payment_url;
        console.log("🚀 Redirecting to WooCommerce fallback payment URL:", redirectUrl);
        window.location.href = redirectUrl;
        return;
      }

      setCart([]);
      setActiveTab("home");
      const successMsg = !user ? 
        `تم استلام طلبك بنجاح! رقم الطلب: #${wcOrder.id}. لقد تم إنشاء حساب لك وإرسال رابط تعيين كلمة المرور لبريدك الإلكتروني.` :
        `تم استلام طلبك بنجاح! رقم الطلب: #${wcOrder.id}`;
      alert(successMsg);
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "حدث خطأ أثناء إتمام الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const telrRef = urlParams.get('telr_ref');
    const orderId = urlParams.get('order_id');
    const telrStatus = urlParams.get('telr_status');
    const paymentStatus = urlParams.get('payment');

    if (telrRef && orderId) {
      const checkPayment = async () => {
        try {
          const res = await fetch(`/api/payment/telr/check/${telrRef}`);
          const data = await res.json();
          
          if (data.order && data.order.status && data.order.status.code === 3) {
            // Payment successful
            // Update WooCommerce order status
            await fetch(`/api/orders/${orderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'processing', set_paid: true })
            });
            alert("تمت عملية الدفع بنجاح! شكراً لتسوقكم.");
            setCart([]);
            window.history.replaceState({}, document.title, "/");
          } else {
            alert("فشلت عملية الدفع أو تم إلغاؤها.");
            window.history.replaceState({}, document.title, "/");
          }
        } catch (error) {
          console.error("Error checking payment:", error);
        }
      };
      checkPayment();
    } else if (paymentStatus === 'success' && orderId) {
      // Direct return from Telr success
      const finalizeSuccess = async () => {
        try {
          await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'processing', set_paid: true })
          });
          alert("تمت عملية الدفع بنجاح! شكراً لتسوقكم.");
          setCart([]);
          window.history.replaceState({}, document.title, "/");
        } catch (error) {
          console.error("Error finalizing success payment:", error);
        }
      };
      finalizeSuccess();
    } else if (telrStatus === 'cancel' || paymentStatus === 'cancel') {
      alert("تم إلغاء عملية الدفع.");
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"
          />
          <p className="text-gray-600 font-medium font-sans">جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900" dir="rtl">
      {/* Top Bar */}
      <div className="bg-red-700 text-white py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Phone size={14} /> <span dir="ltr">058 041 0063</span></span>
            <span className="flex items-center gap-2"><Mail size={14} /> info@droubalsalamah.com</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} /> المملكة العربية السعودية، الرياض
          </div>
        </div>
      </div>

      {/* Sample Data Notice */}
      {(isUsingSampleData || isUsingSampleCategories) && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
          <p className="text-amber-800 text-xs font-medium flex items-center justify-center gap-2">
            <AlertTriangle size={14} />
            يتم عرض منتجات تجريبية حالياً. يرجى التأكد من صحة مفاتيح WooCommerce وتفعيل الـ Permalinks في متجرك.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <Flame className="text-red-600" />
              دروب السلامة
            </h1>
            <nav className="hidden lg:flex items-center gap-8 font-medium text-gray-600">
              <button onClick={() => setActiveTab("home")} className={`hover:text-red-600 transition-colors ${activeTab === "home" ? "text-red-600" : ""}`}>الرئيسية</button>
              <button onClick={() => setActiveTab("shop")} className={`hover:text-red-600 transition-colors ${activeTab === "shop" ? "text-red-600" : ""}`}>المتجر</button>
              {["admin", "manager", "staff"].includes(userRole) && (
                <button onClick={() => setActiveTab("admin")} className={`hover:text-red-600 transition-colors flex items-center gap-2 ${activeTab === "admin" ? "text-red-600" : ""}`}>
                  <LayoutDashboard size={18} /> لوحة الإدارة
                </button>
              )}
              <button className="hover:text-red-600 transition-colors">عن الشركة</button>
              <button className="hover:text-red-600 transition-colors">اتصل بنا</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="ابحث عن منتج..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full pr-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab("profile")}
                  className={`flex flex-col items-end hidden sm:flex hover:text-red-600 transition-colors ${activeTab === "profile" ? "text-red-600" : ""}`}
                >
                  <span className="text-xs font-bold">{user.displayName || "حسابي"}</span>
                  <span className="text-[10px] text-gray-400">عرض الطلبات</span>
                </button>
                <div className="relative group">
                  <img 
                    src={user.photoURL || "https://ui-avatars.com/api/?name=" + (user.displayName || "User")} 
                    alt={user.displayName || ""} 
                    className="w-10 h-10 rounded-full border border-gray-200 cursor-pointer" 
                    onClick={() => setActiveTab("profile")}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
                    <div className="p-4 border-b border-gray-50">
                      <p className="text-sm font-bold truncate">{user.displayName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => setActiveTab("profile")}
                        className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
                      >
                        <ShoppingBag size={16} /> طلباتي
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        <LogOut size={16} /> تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-red-600 transition-colors"
              >
                <User size={20} />
                <span>تسجيل الدخول</span>
              </button>
            )}

            <button 
              onClick={() => setIsFavoritesOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <Heart size={24} className={`${favorites.length > 0 ? "fill-red-600 text-red-600" : "text-gray-600"}`} />
              {favorites.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {favorites.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <ShoppingCart size={24} className="text-gray-600" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-80 bg-white z-50 lg:hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">القائمة</h2>
                <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
              </div>
              <div className="flex flex-col gap-6 text-lg font-medium">
                <button onClick={() => { setActiveTab("home"); setIsMenuOpen(false); }} className="text-right">الرئيسية</button>
                <button onClick={() => { setActiveTab("shop"); setIsMenuOpen(false); }} className="text-right">المتجر</button>
                {["admin", "manager", "staff"].includes(userRole) && (
                  <button onClick={() => { setActiveTab("admin"); setIsMenuOpen(false); }} className="text-right text-red-600 flex items-center justify-end gap-2">
                    <LayoutDashboard size={20} /> لوحة الإدارة
                  </button>
                )}
                <button className="text-right">عن الشركة</button>
                <button className="text-right">اتصل بنا</button>
                <div className="pt-6 border-t border-gray-100 mt-6">
                  {user ? (
                    <div className="space-y-6">
                      <button 
                        onClick={() => { setActiveTab("profile"); setIsMenuOpen(false); }} 
                        className="w-full text-right flex items-center justify-end gap-3 font-bold text-gray-900"
                      >
                        <User size={20} className="text-red-600" /> حسابي (طلباتي)
                      </button>
                      <button 
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                        className="w-full text-right flex items-center justify-end gap-3 font-bold text-red-600"
                      >
                        <LogOut size={20} /> تسجيل الخروج
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { handleLogin(); setIsMenuOpen(false); }} 
                      className="w-full text-right flex items-center justify-end gap-3 font-bold text-gray-900"
                    >
                      <User size={20} className="text-red-600" /> تسجيل الدخول
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Favorites Drawer */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFavoritesOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-red-600">
                  <Heart size={20} fill="currentColor" /> المنتجات المفضلة
                </h2>
                <button onClick={() => setIsFavoritesOpen(false)}><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {favorites.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Heart size={64} strokeWidth={1} />
                    <p>قائمة المفضلة فارغة</p>
                    <button 
                      onClick={() => { setIsFavoritesOpen(false); setActiveTab("shop"); }}
                      className="text-red-600 font-medium underline"
                    >
                      تصفح المنتجات وأضف مفضلاتك
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {favorites.map(favId => {
                      const product = products.find(p => p.id === favId);
                      if (!product) return null;
                      return (
                        <div key={product.id} className="flex gap-4 group">
                          <div className="relative w-20 h-20 shrink-0">
                            <img 
                              src={product.images[0]?.src || "https://picsum.photos/seed/safety/200"} 
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg bg-gray-100"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-600 transition-colors">{product.name}</h3>
                            <p className="text-red-600 font-bold mt-1">{product.price} ر.س</p>
                            <div className="flex items-center gap-3 mt-2">
                              <button 
                                onClick={() => {
                                  if (product.attributes && product.attributes.length > 0) {
                                    setSelectedProduct(product);
                                    setIsFavoritesOpen(false);
                                  } else {
                                    addToCart(product);
                                  }
                                }}
                                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                              >
                                <ShoppingCart size={14} /> أضف للسلة
                              </button>
                              <button 
                                onClick={() => toggleFavorite(product.id)}
                                className="text-xs text-gray-400 hover:text-red-600"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {favorites.some(id => !products.find(p => p.id === id)) && (
                      <p className="text-[10px] text-gray-400 text-center mt-4 italic">
                        بعض المنتجات المفضلة قد لا تظهر هنا لأنها في صفحات أخرى.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart size={20} /> سلة المشتريات
                </h2>
                <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                    <ShoppingCart size={64} strokeWidth={1} />
                    <p>السلة فارغة حالياً</p>
                    <button 
                      onClick={() => { setIsCartOpen(false); setActiveTab("shop"); }}
                      className="text-red-600 font-medium underline"
                    >
                      ابدأ التسوق الآن
                    </button>
                  </div>
                ) : (
                    <div className="space-y-6">
                      {cart.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex gap-4">
                          <img 
                            src={item.images[0]?.src || "https://picsum.photos/seed/safety/200"} 
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
                            {item.selectedAttributes && Object.entries(item.selectedAttributes).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.selectedAttributes).map(([name, value]) => (
                                  <span key={name} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                    {name}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-red-600 font-bold mt-1">{item.price} ر.س</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center border rounded-md">
                                <button onClick={() => updateQuantity(item.id, -1, item.selectedAttributes)} className="px-2 py-1 hover:bg-gray-50">-</button>
                                <span className="px-3 py-1 text-sm border-x">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1, item.selectedAttributes)} className="px-2 py-1 hover:bg-gray-50">+</button>
                              </div>
                              <button 
                                onClick={() => removeFromCart(item.id, item.selectedAttributes)}
                                className="text-xs text-gray-400 hover:text-red-600"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">الإجمالي</span>
                    <span className="text-2xl font-bold text-red-700">{cartTotal.toFixed(2)} ر.س</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} /> إتمام الطلب
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="min-h-[calc(100vh-136px)] pb-20 lg:pb-0">
        {activeTab === "admin" && ["admin", "manager", "staff"].includes(userRole) ? (
          <AdminDashboard userRole={userRole} userPermissions={userPermissions} />
        ) : activeTab === "profile" && user ? (
          <ProfilePage 
            user={user} 
            onBack={() => setActiveTab("shop")} 
          />
        ) : activeTab === "checkout" ? (
          <CheckoutPage 
            cart={cart} 
            total={cartTotal} 
            user={user} 
            onFinalize={finalizeOrder} 
            loading={checkoutLoading}
            onBack={() => setActiveTab("shop")}
            shippingMethods={shippingMethods}
            onRemoveItem={(id, attrs) => removeFromCart(id, attrs)}
            showrooms={showrooms}
            bankAccounts={bankAccounts}
            paymentGateways={paymentGateways}
            loadingGateways={loadingGateways}
          />
        ) : activeTab === "home" ? (
          <>
            {/* Hero Section / Banner Slider */}
            <section className="relative h-[400px] md:h-[600px] flex items-center overflow-hidden bg-gray-900">
              <AnimatePresence mode="wait">
                {banners.length > 0 ? (
                  <motion.div 
                    key={banners[currentBannerIndex].id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                  >
                    <div className="absolute inset-0 opacity-40">
                      <img 
                        src={banners[currentBannerIndex].url} 
                        alt={banners[currentBannerIndex].title || "Hero"} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent" />
                    
                    <div className="relative h-full max-w-7xl mx-auto px-4 w-full flex items-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-2xl"
                      >
                        {banners[currentBannerIndex].title && (
                          <h2 className="text-4xl md:text-7xl font-black text-white leading-tight mb-6">
                            {banners[currentBannerIndex].title}
                          </h2>
                        )}
                        {banners[currentBannerIndex].subtitle && (
                          <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed">
                            {banners[currentBannerIndex].subtitle}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => banners[currentBannerIndex].link ? window.location.href = banners[currentBannerIndex].link : setActiveTab("shop")}
                            className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center gap-2"
                          >
                            تسوق الآن <ArrowRight size={20} />
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 opacity-40">
                      <img 
                        src="https://picsum.photos/seed/firefighter/1920/1080" 
                        alt="Hero" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent" />
                    
                    <div className="relative h-full max-w-7xl mx-auto px-4 w-full flex items-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl"
                      >
                        <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold mb-6">
                          شركة دروب السلامة المحدودة
                        </span>
                        <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
                          نحمي ممتلكاتك <br /> <span className="text-red-500">بأعلى معايير</span> السلامة
                        </h2>
                        <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                          نقدم حلولاً متكاملة لأنظمة إطفاء الحريق وأدوات السلامة المهنية المعتمدة عالمياً ومحلياً.
                        </p>
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => setActiveTab("shop")}
                            className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center gap-2"
                          >
                            تسوق الآن <ArrowRight size={20} />
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {/* Slider Controls */}
              {banners.length > 1 && (
                <div className="absolute bottom-8 right-8 flex gap-2 z-10">
                  {banners.map((banner, i) => (
                    <button
                      key={banner.id}
                      onClick={() => setCurrentBannerIndex(i)}
                      className={`w-3 h-3 rounded-full transition-all ${i === currentBannerIndex ? 'bg-red-600 w-8' : 'bg-white/30 hover:bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Scrolling Categories Bar */}
            <section className="bg-white border-b border-gray-100 py-8 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6 md:hidden">
                   <h3 className="font-bold">التصنيفات</h3>
                   <button onClick={() => setActiveTab("shop")} className="text-red-600 text-sm font-bold">عرض الكل</button>
                </div>
                
                <div className="relative">
                  {categories.length > 0 && (
                    <div className="flex overflow-hidden">
                      <motion.div 
                        className="flex"
                        animate={{ x: ["0%", "50%"] }} // في RTL، التحريك الموجب يحرك العناصر لليسار في بعض المتصفحات، سنستخدم القيمة التي تضمن الاستمرارية
                        transition={{ 
                          duration: 100, // سرعة هادئة جداً
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        style={{ width: "max-content" }}
                      >
                        {/* نكرر القائمة مرتين فقط مع ضمان تماثل المسافات */}
                        {[...categories, ...categories].map((cat, index) => (
                          <div key={`${cat.id}-${index}`} className="px-6 flex-none">
                            <CategoryItem 
                              cat={cat} 
                              onClick={() => { setSelectedCategory(cat.id); setActiveTab("shop"); }} 
                            />
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  )}
                  
                  {/* Gradient Overlays for smooth fade */}
                  <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
                </div>
              </div>
            </section>

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex justify-between items-center mb-12">
                    <h2 className="text-3xl font-bold">منتجات مميزة</h2>
                    <button onClick={() => setActiveTab("shop")} className="text-red-600 font-bold hover:underline">عرض الكل</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {featuredProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={addToCart} 
                        isFavorite={favorites.includes(product.id)}
                        onToggleFavorite={() => toggleFavorite(product.id)}
                        onView={(p) => {
                          setSelectedProduct(p);
                          addToRecentlyViewed(p);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Latest Products */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-3xl font-bold">أحدث المنتجات</h2>
                  <button onClick={() => setActiveTab("shop")} className="text-red-600 font-bold hover:underline">عرض الكل</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                  {products.slice(0, homeSettings.productsPerPage).map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToCart={addToCart} 
                      isFavorite={favorites.includes(product.id)}
                      onToggleFavorite={() => toggleFavorite(product.id)}
                      onView={(p) => {
                        setSelectedProduct(p);
                        addToRecentlyViewed(p);
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Best Sellers */}
            <section className="py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-3xl font-bold">الأكثر مبيعاً</h2>
                  <button onClick={() => setActiveTab("shop")} className="text-red-600 font-bold hover:underline">عرض الكل</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                  {products.slice(homeSettings.productsPerPage, homeSettings.productsPerPage * 2).map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToCart={addToCart} 
                      isFavorite={favorites.includes(product.id)}
                      onToggleFavorite={() => toggleFavorite(product.id)}
                      onView={(p) => {
                        setSelectedProduct(p);
                        addToRecentlyViewed(p);
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex justify-between items-center mb-12">
                    <h2 className="text-3xl font-bold">منتجات شاهدتها مؤخراً</h2>
                    <button onClick={() => setRecentlyViewed([])} className="text-gray-400 text-sm hover:text-red-600 transition-colors">مسح الكل</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {recentlyViewed.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={addToCart} 
                        isFavorite={favorites.includes(product.id)}
                        onToggleFavorite={() => toggleFavorite(product.id)}
                        onView={(p) => {
                          setSelectedProduct(p);
                          addToRecentlyViewed(p);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Features */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { icon: <ShieldCheck className="text-red-600" />, title: "منتجات معتمدة", desc: "جميع منتجاتنا مطابقة للمواصفات" },
                    { icon: <Truck className="text-red-600" />, title: "توصيل سريع", desc: "نشحن لجميع مناطق المملكة" },
                    { icon: <Clock className="text-red-600" />, title: "دعم فني 24/7", desc: "فريق متخصص لخدمتكم دائماً" },
                    { icon: <Flame className="text-red-600" />, title: "حلول متكاملة", desc: "من التوريد وحتى التركيب" }
                  ].map((f, i) => (
                    <motion.div 
                      key={f.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-6">
                        {f.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                      <p className="text-gray-500">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Sidebar Filters */}
              <aside className="w-full md:w-64 shrink-0">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-32">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Filter size={20} /> التصنيفات
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-right px-4 py-2 rounded-lg transition-colors ${selectedCategory === null ? "bg-red-600 text-white" : "hover:bg-gray-50"}`}
                    >
                      الكل
                    </button>
                    {categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full text-right px-4 py-2 rounded-lg transition-colors ${selectedCategory === cat.id ? "bg-red-600 text-white" : "hover:bg-gray-50"}`}
                      >
                        {cat.name} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Product Grid */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <h2 className="text-2xl font-bold">
                    {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "كل المنتجات"}
                  </h2>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
                      <span className="text-xs text-gray-400 whitespace-nowrap">ترتيب حسب:</span>
                      <select 
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split("-");
                          setSortBy(newSortBy);
                          setSortOrder(newSortOrder);
                        }}
                        className="text-sm font-bold bg-transparent outline-none cursor-pointer"
                      >
                        <option value="date-desc">الأحدث</option>
                        <option value="price-asc">السعر: من الأقل للأعلى</option>
                        <option value="price-desc">السعر: من الأعلى للأقل</option>
                        <option value="popularity-desc">الأكثر شعبية</option>
                        <option value="rating-desc">الأعلى تقييماً</option>
                      </select>
                    </div>
                    <span className="text-gray-500 text-sm whitespace-nowrap">{filteredProducts.length} منتج</span>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p>لم يتم العثور على منتجات تطابق بحثك</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProducts.map(product => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={addToCart} 
                        isFavorite={favorites.includes(product.id)}
                        onToggleFavorite={() => toggleFavorite(product.id)}
                        onView={(p) => {
                          setSelectedProduct(p);
                          addToRecentlyViewed(p);
                        }}
                      />
                    ))}
                  </div>
                )}

                {hasMore && (
                  <div ref={loadMoreRef} className="mt-12 text-center">
                    <button 
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="bg-white border-2 border-red-600 text-red-600 px-10 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {loadingMore ? (
                        <>
                          <Clock className="animate-spin" size={20} /> جاري التحميل...
                        </>
                      ) : (
                        "عرض المزيد من المنتجات"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-24 lg:pb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <h3 className="text-2xl font-bold text-red-500 mb-6 flex items-center gap-2">
                <Flame /> دروب السلامة
              </h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                الشركة الرائدة في مجال أنظمة السلامة وإطفاء الحريق في المملكة العربية السعودية. خبرة تمتد لسنوات في حماية الأرواح والممتلكات.
              </p>
              <div className="flex gap-4">
                {/* Social icons would go here */}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-6">روابط سريعة</h4>
              <ul className="space-y-4 text-gray-400">
                <li><button onClick={() => setActiveTab("home")} className="hover:text-white transition-colors">الرئيسية</button></li>
                <li><button onClick={() => setActiveTab("shop")} className="hover:text-white transition-colors">المتجر</button></li>
                <li><button className="hover:text-white transition-colors">عن الشركة</button></li>
                <li><button className="hover:text-white transition-colors">سياسة الخصوصية</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-6">التصنيفات</h4>
              <ul className="space-y-4 text-gray-400">
                {categories.slice(0, 4).map(cat => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => { setSelectedCategory(cat.id); setActiveTab("shop"); }}
                      className="hover:text-white transition-colors"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-6">تواصل معنا</h4>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-red-500 shrink-0" />
                  <span>الفرع الرئيسي الرياض شارع الظهران</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={20} className="text-red-500 shrink-0" />
                  <span dir="ltr">058 041 0063</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={20} className="text-red-500 shrink-0" />
                  <span>info@droubalsalamah.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} شركة دروب السلامة. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>

      {/* Product Modal */}
      <ProductModal 
        isOpen={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        onToggleFavorite={() => selectedProduct && toggleFavorite(selectedProduct.id)}
        allProducts={[...products, ...recentlyViewed, ...cart]}
        onProductClick={(p) => {
          setSelectedProduct(null);
          setTimeout(() => {
            setSelectedProduct(p);
            addToRecentlyViewed(p);
          }, 100);
        }}
      />

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onGoogleLogin={async () => {
          try {
            await signInWithPopup(auth, googleProvider);
            setIsLoginModalOpen(false);
          } catch (error) {
            console.error("Login error:", error);
          }
        }}
      />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${activeTab === "home" ? "text-red-600" : "text-gray-500"}`}
        >
          <Home size={22} />
          <span className="text-[10px] font-bold">الرئيسية</span>
        </button>

        <button 
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[60px] text-gray-500"
        >
          <Grid size={22} />
          <span className="text-[10px] font-bold">الأقسام</span>
        </button>

        <button 
          onClick={() => user ? setActiveTab("profile") : setIsLoginModalOpen(true)}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${activeTab === "profile" ? "text-red-600" : "text-gray-500"}`}
        >
          <User size={22} />
          <span className="text-[10px] font-bold">حسابي</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab("shop");
            // Focus search input if possible, or just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 min-w-[60px] text-gray-500"
        >
          <Search size={22} />
          <span className="text-[10px] font-bold">بحث</span>
        </button>

        <button 
          onClick={() => setIsFavoritesOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[60px] text-gray-500 relative"
        >
          <div className="relative">
            <Heart size={22} className={favorites.length > 0 ? "fill-red-600 text-red-600" : ""} />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">المفضلة</span>
        </button>

        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[60px] text-gray-500 relative"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">{cartTotal.toFixed(0)} ر.س</span>
        </button>

        <a 
          href="https://wa.me/966580410063" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 min-w-[60px] text-green-600"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span className="text-[10px] font-bold">واتساب</span>
        </a>
      </div>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/966580410063" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-28 lg:bottom-10 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center group"
        title="تواصل معنا عبر واتساب"
      >
        <MessageCircle size={28} className="fill-white" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold mr-0 group-hover:mr-2">
          تواصل معنا
        </span>
      </a>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product, selectedAttributes?: { [key: string]: string }) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView?: (p: Product) => void;
  key?: any;
}

function ProfilePage({ user, onBack }: { user: FirebaseUser; onBack: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user.uid]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'processing': return 'قيد التنفيذ';
      case 'pending': return 'قيد الانتظار';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">حسابي</h2>
          <p className="text-gray-500">مرحباً بك، {user.displayName}</p>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-red-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowRight size={20} /> العودة للمتجر
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col items-center text-center mb-8">
              <img 
                src={user.photoURL || "https://ui-avatars.com/api/?name=" + (user.displayName || "User")} 
                className="w-24 h-24 rounded-full border-4 border-red-50 mb-4" 
                alt={user.displayName || ""} 
                referrerPolicy="no-referrer"
              />
              <h3 className="text-xl font-bold">{user.displayName}</h3>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-gray-50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">تاريخ الانضمام</span>
                <span className="font-medium">{new Date(user.metadata.creationTime || "").toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">عدد الطلبات</span>
                <span className="font-medium">{orders.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold mb-6">طلباتي الأخيرة</h3>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={40} className="text-gray-200" />
              </div>
              <p className="text-gray-500">ليس لديك أي طلبات سابقة حتى الآن.</p>
              <button 
                onClick={onBack}
                className="mt-6 bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                ابدأ التسوق الآن
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <ShoppingBag className="text-red-600" size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">رقم الطلب: #{order.wcOrderId || order.id.slice(0, 8)}</p>
                        <p className="font-bold">{new Date(order.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className="text-xl font-black text-red-600">{order.total.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                            <img src={item.images?.[0]?.src} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.quantity} × {item.price} ر.س</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        <p>طريقة الدفع: {order.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}</p>
                        <p>الشحن: {order.shipping_method}</p>
                      </div>
                      <button className="text-red-600 text-sm font-bold hover:underline">تفاصيل الطلب</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, isFavorite, onToggleFavorite, onView }: ProductCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onClick={() => onView?.(product)}
      className={`group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all ${onView ? 'cursor-pointer' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.images[0]?.src || "https://picsum.photos/seed/safety/400"} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-2 rounded-full shadow-md transition-colors ${isFavorite ? "bg-red-600 text-white" : "bg-white text-gray-400 hover:text-red-600"}`}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          {product.on_sale && (
            <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full text-center">
              عرض خاص
            </div>
          )}
          {(product.featured === true || String(product.featured) === "true" || (product.featured as any) === 1 || String(product.featured) === "1") && (
            <div className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded-full text-center flex items-center gap-1">
              <Flame size={10} fill="currentColor" /> مميز
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="text-xs text-gray-400 mb-2">{product.categories[0]?.name}</div>
        <h3 className="font-bold text-lg mb-4 line-clamp-2 h-14 group-hover:text-red-600 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {product.on_sale && (
              <span className="text-xs text-gray-400 line-through">{product.regular_price} ر.س</span>
            )}
            <span className="text-xl font-black text-red-700">{product.price} ر.س</span>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (product.attributes && product.attributes.length > 0) {
                onView?.(product);
              } else {
                onAddToCart(product); 
              }
            }}
            className="bg-gray-900 text-white p-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-gray-200"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface CategoryItemProps {
  cat: Category;
  onClick: () => void;
  key?: string;
}

function CategoryItem({ cat, onClick }: CategoryItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-none flex flex-col items-center gap-3 group"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-gray-100 p-1 group-hover:border-red-600 transition-colors bg-white overflow-hidden shadow-sm">
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 flex items-center justify-center">
          {cat.image ? (
            <img src={cat.image.src} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <ShieldCheck size={32} className="text-gray-300" />
          )}
        </div>
      </div>
      <span className="text-xs md:text-sm font-bold text-gray-700 group-hover:text-red-600 transition-colors">
        {cat.name}
      </span>
    </motion.button>
  );
}

interface CheckoutPageProps {
  cart: CartItem[];
  total: number;
  user: FirebaseUser | null;
  onFinalize: (details: any, shipping: any, paymentMethod: string, extraData?: any) => void;
  loading: boolean;
  onBack: () => void;
  shippingMethods: any[];
  onRemoveItem: (id: number, selectedAttributes?: { [key: string]: string }) => void;
  showrooms: Showroom[];
  bankAccounts: BankDetails[];
  paymentGateways: any[];
  loadingGateways: boolean;
}

function CheckoutPage({ 
  cart, 
  total, 
  user, 
  onFinalize, 
  loading, 
  onBack, 
  shippingMethods, 
  onRemoveItem,
  showrooms,
  bankAccounts,
  paymentGateways,
  loadingGateways
}: CheckoutPageProps) {
  const [formData, setFormData] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: 'الرياض',
    state: 'منطقة الرياض',
    postcode: ''
  });

  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const isGatewayEnabled = (id: string) => {
    // Exact match first
    let g = paymentGateways.find(gw => gw.id === id);
    
    // If not found, try finding by keyword (case insensitive)
    if (!g) {
      g = paymentGateways.find(gw => 
        gw.id.toLowerCase().includes(id.toLowerCase()) || 
        (gw.title && gw.title.toLowerCase().includes(id.toLowerCase()))
      );
    }
    
    if (!g) return false;
    
    // Support multiple "enabled" formats from different WC versions/plugins
    return g.enabled === true || 
           g.enabled === 'yes' || 
           g.enabled === '1' || 
           g.enabled === 1 || 
           g.enabled === 'true';
  };

  const getActualGatewayId = (id: string) => {
    const g = paymentGateways.find(gw => gw.id === id || gw.id.toLowerCase().includes(id.toLowerCase()));
    return g ? g.id : id;
  };

  const isBankTransfer = () => {
    return isGatewayEnabled('bacs') || 
           isGatewayEnabled('bank') || 
           isGatewayEnabled('تحويل') || 
           isGatewayEnabled('حوالة');
  };

  const getBankTransferGatewayId = () => {
    const keywords = ['bacs', 'bank', 'تحويل', 'حوالة'];
    for (const kw of keywords) {
      if (isGatewayEnabled(kw)) return getActualGatewayId(kw);
    }
    return 'bacs';
  };

  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    if (isGatewayEnabled('telr')) return getActualGatewayId('telr');
    if (isGatewayEnabled('applepay')) return getActualGatewayId('applepay');
    if (isGatewayEnabled('tamara')) return getActualGatewayId('tamara');
    if (isGatewayEnabled('cod')) return "cod";
    if (isBankTransfer()) return "bank_transfer";
    return "cod";
  });
  useEffect(() => {
    if (paymentGateways.length > 0) {
      const currentGatewayId = paymentMethod === 'bank_transfer' ? getBankTransferGatewayId() : paymentMethod;
      const currentGateway = paymentGateways.find(g => g.id === currentGatewayId);
      const isCurrentEnabled = currentGateway && (
        currentGateway.enabled === true || 
        currentGateway.enabled === 'yes' || 
        currentGateway.enabled === '1' ||
        currentGateway.enabled === 1 ||
        currentGateway.enabled === 'true'
      );
      
      if (!isCurrentEnabled) {
        if (isGatewayEnabled('telr')) setPaymentMethod(getActualGatewayId('telr'));
        else if (isGatewayEnabled('applepay')) setPaymentMethod(getActualGatewayId('applepay'));
        else if (isGatewayEnabled('tamara')) setPaymentMethod(getActualGatewayId('tamara'));
        else if (isGatewayEnabled('cod')) setPaymentMethod("cod");
        else if (isBankTransfer()) setPaymentMethod("bank_transfer");
      }
    }
  }, [paymentGateways]);

  const [isCompany, setIsCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    taxNumber: '',
    commercialRegister: ''
  });
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankDetails | null>(null);
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptHolderName, setReceiptHolderName] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingCost = parseFloat(selectedShipping?.settings?.cost?.value || "0");
  const finalTotal = total + shippingCost;

  // Tamara Widget Logic for Checkout
  useEffect(() => {
    if (isGatewayEnabled('tamara')) {
      const initTamara = () => {
        // @ts-ignore
        if (window.TamaraWidgetV2) {
          // @ts-ignore
          if (typeof window.TamaraWidgetV2.refresh === 'function') {
            // @ts-ignore
            window.TamaraWidgetV2.refresh();
          }
        }
      };
      const timers = [500, 1000, 2000].map(delay => setTimeout(initTamara, delay));
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [finalTotal, paymentGateways]);

  const filteredShippingMethods = useMemo(() => {
    if (isPickup) return [];
    
    const freeShippingMethods = shippingMethods.filter(method => {
      if (method.method_id === 'free_shipping') {
        const minAmount = parseFloat(method.settings?.min_amount?.value || "0");
        return total >= minAmount;
      }
      return false;
    });

    if (freeShippingMethods.length > 0) {
      return freeShippingMethods;
    }

    return shippingMethods.filter(method => method.method_id !== 'free_shipping');
  }, [shippingMethods, total, isPickup]);

  useEffect(() => {
    if (isPickup) {
      setSelectedShipping({
        id: 'pickup',
        method_id: 'pickup',
        method_title: 'استلام من المعرض',
        settings: { cost: { value: '0' } }
      });
      return;
    }

    if (filteredShippingMethods.length > 0) {
      const freeMethod = filteredShippingMethods.find(m => m.method_id === 'free_shipping');
      if (freeMethod) {
        setSelectedShipping(freeMethod);
      } else if (!selectedShipping || !filteredShippingMethods.find(m => m.id === selectedShipping.id)) {
        setSelectedShipping(filteredShippingMethods[0]);
      }
    } else {
      setSelectedShipping(null);
    }
  }, [filteredShippingMethods, isPickup]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (isPickup && !selectedShowroom) {
      setError('يرجى اختيار المعرض للاستلام');
      return;
    }

    if (paymentMethod === 'bank_transfer' && !receiptFile) {
      setError('يرجى رفع إيصال التحويل البنكي');
      return;
    }

    if (paymentMethod === 'bank_transfer' && !selectedBankAccount) {
      setError('يرجى اختيار الحساب البنكي المحول إليه');
      return;
    }

    const extraData = {
      isCompany,
      companyInfo: isCompany ? companyInfo : undefined,
      pickupShowroom: isPickup ? selectedShowroom : undefined,
      bankTransferInfo: paymentMethod === 'bank_transfer' ? {
        receiptUrl: receiptFile,
        holderName: receiptHolderName,
        bankAccount: selectedBankAccount
      } : undefined
    };

    onFinalize(formData, selectedShipping, paymentMethod, extraData);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingCart size={64} className="mx-auto mb-6 text-gray-200" />
        <h2 className="text-2xl font-bold mb-4">سلة المشتريات فارغة</h2>
        <button onClick={onBack} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold">العودة للمتجر</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Checkout Form */}
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-8">إتمام الطلب</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-pulse">
              <AlertCircle size={24} />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold border-b pb-4">معلومات الشحن</h3>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                <div 
                  onClick={() => setIsPickup(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all ${!isPickup ? 'bg-white shadow-sm text-red-600 font-bold' : 'text-gray-500'}`}
                >
                  <Truck size={18} /> توصيل للمنزل
                </div>
                <div 
                  onClick={() => setIsPickup(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all ${isPickup ? 'bg-white shadow-sm text-red-600 font-bold' : 'text-gray-500'}`}
                >
                  <Building2 size={18} /> استلام من المعرض
                </div>
              </div>

              {isPickup ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold text-gray-600">اختر المعرض للاستلام</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showrooms.filter(s => s.active).map(showroom => (
                      <div 
                        key={showroom.id}
                        onClick={() => setSelectedShowroom(showroom)}
                        className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedShowroom?.id === showroom.id ? 'border-red-600 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <p className="font-bold mb-1">{showroom.city}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <MapPin size={12} /> {showroom.city}
                        </div>
                        <div className="flex gap-3 mt-2">
                          <a href={showroom.locationLink} target="_blank" rel="noopener noreferrer" className="text-red-600 text-xs font-bold flex items-center gap-1">
                            <MapPin size={12} /> الموقع
                          </a>
                          <a href={`https://wa.me/${showroom.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs font-bold flex items-center gap-1">
                            <MessageCircle size={12} /> واتساب
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">الاسم الأول</label>
                      <input 
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">الاسم الأخير</label>
                      <input 
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">البريد الإلكتروني</label>
                      <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">رقم الجوال</label>
                      <input 
                        type="tel"
                        required
                        placeholder="05xxxxxxxx"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">العنوان (الحي، الشارع، رقم المبنى)</label>
                    <input 
                      required
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">المدينة</label>
                      <select 
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                      >
                        <option value="الرياض">الرياض</option>
                        <option value="جدة">جدة</option>
                        <option value="الدمام">الدمام</option>
                        <option value="مكة المكرمة">مكة المكرمة</option>
                        <option value="المدينة المنورة">المدينة المنورة</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">الرمز البريدي (اختياري)</label>
                      <input 
                        value={formData.postcode}
                        onChange={e => setFormData({...formData, postcode: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" 
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-xl font-bold">طلب لشركة / مؤسسة</h3>
                <div 
                  onClick={() => setIsCompany(!isCompany)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${isCompany ? 'bg-red-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${isCompany ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
              <p className="text-xs text-gray-500">إذا كنت ممثلاً لشركة أو مؤسسة يمكنك إدراج اسمها والرقم الضريبي والسجل التجاري لتوثيقها في فاتورة الطلب.</p>
              
              {isCompany && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600">اسم الشركة</label>
                    <input 
                      value={companyInfo.name}
                      onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600">الرقم الضريبي</label>
                    <input 
                      value={companyInfo.taxNumber}
                      onChange={e => setCompanyInfo({...companyInfo, taxNumber: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600">السجل التجاري</label>
                    <input 
                      value={companyInfo.commercialRegister}
                      onChange={e => setCompanyInfo({...companyInfo, commercialRegister: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>

            {!isPickup && (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
                <h3 className="text-xl font-bold border-b pb-4">طريقة الشحن</h3>
                <div className="space-y-3">
                  {filteredShippingMethods.length === 0 ? (
                    <p className="text-sm text-gray-500">جاري تحميل طرق الشحن...</p>
                  ) : (
                    filteredShippingMethods.map((method) => (
                      <div 
                        key={method.id}
                        onClick={() => setSelectedShipping(method)}
                        className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedShipping?.id === method.id ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-4 ${selectedShipping?.id === method.id ? "border-red-600 bg-white" : "border-gray-200 bg-white"}`} />
                          <div>
                            <p className="font-bold">{method.method_title}</p>
                            <p className="text-xs text-gray-500">{method.zone_name}</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-700">
                          {method.method_id === 'free_shipping' ? 'مجاني' : `${method.settings?.cost?.value || "0"} ر.س`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold border-b pb-4">طريقة الدفع</h3>
              <div className="space-y-3">
                {loadingGateways ? (
                  <div className="flex flex-col items-center py-12 text-gray-400">
                    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-bold">جاري تحميل طرق الدفع...</p>
                  </div>
                ) : paymentGateways.filter(g => isGatewayEnabled(g.id)).length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl text-gray-400">
                    <AlertCircle className="mx-auto mb-4 text-gray-300" size={48} />
                    <p className="font-bold text-lg mb-2">لا توجد طرق دفع مفعّلة</p>
                    <p className="text-sm">يرجى التأكد من تفعيل طرق الدفع في لوحة تحكم ووكومرس</p>
                  </div>
                ) : (
                  <>
                    {isGatewayEnabled('telr') && (
                      <div 
                        onClick={() => setPaymentMethod(getActualGatewayId('telr'))}
                        className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod.toLowerCase().includes("telr") ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod.toLowerCase().includes("telr") ? "border-red-600 bg-white" : "border-gray-200 bg-white"}`} />
                        <div className="flex-1">
                          <p className="font-bold text-lg">الدفع باستخدام البطاقات الائتمانية</p>
                          <p className="text-sm text-gray-500">دفع باستخدام بطاقات فيزا / ماستر كارد / مدى</p>
                          <div className="flex gap-3 mt-3">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-6 opacity-80" alt="Apple Pay" referrerPolicy="no-referrer" />
                            <img src="https://droubalsalamah.com/wp-content/plugins/telr-payment-gateway/assets/images/mada.png" className="h-6" alt="Mada" onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/8/84/Mada_Logo.svg"} referrerPolicy="no-referrer" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" referrerPolicy="no-referrer" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6" alt="Visa" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentGateways.length > 0 && (
                      <div 
                        onClick={() => setPaymentMethod(isGatewayEnabled('applepay') ? getActualGatewayId('applepay') : 'telr_applepay')}
                        className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod.toLowerCase().includes("applepay") ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod.toLowerCase().includes("applepay") ? "border-black bg-white" : "border-gray-200 bg-white"}`} />
                        <div className="flex-1">
                          <p className="font-bold text-lg">Apple Pay</p>
                          <p className="text-sm text-gray-500">دفع سريع وآمن عبر Apple Pay</p>
                        </div>
                        <div className="flex gap-2">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-10" alt="Apple Pay" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}

                    {isGatewayEnabled('cod') && (
                      <div 
                        onClick={() => setPaymentMethod("cod")}
                        className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === "cod" ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod === "cod" ? "border-red-600 bg-white" : "border-gray-200 bg-white"}`} />
                        <div>
                          <p className="font-bold">الدفع عند الاستلام (COD)</p>
                          <p className="text-xs text-gray-500">ادفع نقداً عند استلام طلبك من مندوب التوصيل</p>
                        </div>
                      </div>
                    )}

                    {isBankTransfer() && (
                      <div 
                        onClick={() => setPaymentMethod("bank_transfer")}
                        className={`flex flex-col gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === "bank_transfer" ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod === "bank_transfer" ? "border-red-600 bg-white" : "border-gray-200 bg-white"}`} />
                          <div className="flex-1">
                            <p className="font-bold">{paymentGateways.find(g => g.id === getBankTransferGatewayId())?.title || "حوالة بنكية"}</p>
                            <p className="text-xs text-gray-500">قم بالتحويل للحساب البنكي وارفع إيصال التحويل</p>
                          </div>
                          <CreditCard className="text-gray-400" />
                        </div>

                        {paymentMethod === "bank_transfer" && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-3">
                              <label className="text-sm font-bold text-gray-600">اختر الحساب البنكي للتحويل</label>
                              <div className="grid grid-cols-1 gap-3">
                                {bankAccounts.filter(b => b.active).map(account => (
                                  <div 
                                    key={account.id}
                                    onClick={() => setSelectedBankAccount(account)}
                                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedBankAccount?.id === account.id ? 'border-red-600 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <p className="font-bold text-red-700">{account.bankName}</p>
                                      <div className={`w-5 h-5 rounded-full border-4 ${selectedBankAccount?.id === account.id ? 'border-red-600 bg-white' : 'border-gray-200 bg-white'}`} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <p className="text-gray-500">اسم الحساب:</p>
                                        <p className="font-bold">{account.accountName}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">رقم الحساب:</p>
                                        <p className="font-bold">{account.accountNumber}</p>
                                      </div>
                                      <div className="md:col-span-2">
                                        <p className="text-gray-500">الآيبان (IBAN):</p>
                                        <p className="font-bold">{account.iban}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-50">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">اسم صاحب الحساب المحول منه</label>
                                <input 
                                  value={receiptHolderName}
                                  onChange={e => setReceiptHolderName(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                                  placeholder="أدخل الاسم الثلاثي"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">إرفاق إيصال التحويل (صورة أو PDF)</label>
                                <div className="relative">
                                  <input 
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="receipt-upload"
                                  />
                                  <label 
                                    htmlFor="receipt-upload"
                                    className="flex items-center justify-center gap-2 w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:bg-gray-100 transition-all"
                                  >
                                    {receiptFile ? (
                                      <span className="text-green-600 font-bold flex items-center gap-2">
                                        <ShieldCheck size={16} /> تم اختيار الملف
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 flex items-center gap-2">
                                        <Upload size={16} /> اضغط لرفع الملف
                                      </span>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isGatewayEnabled('tamara') && (
                      <div 
                        onClick={() => setPaymentMethod(getActualGatewayId('tamara'))}
                        className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod.toLowerCase().includes("tamara") ? "border-[#FF7062] bg-[#FFF9F8]" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod.toLowerCase().includes("tamara") ? "border-[#FF7062] bg-white" : "border-gray-200 bg-white"}`} />
                        <div className="flex-1">
                          <p className="font-bold text-lg">تمارا (Tamara)</p>
                          <p className="text-sm text-gray-500">قسم فاتورتك على دفعات بدون فوائد</p>
                        </div>
                        <div className="flex gap-2">
                          <img src="https://cdn.tamara.co/assets/svg/tamara-logo-badge-en.svg" className="h-10" alt="Tamara" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}

                    {/* Fallback for other enabled gateways */}
                    {paymentGateways
                      .filter(g => isGatewayEnabled(g.id) && !['telr', 'applepay', 'cod', 'tamara'].includes(g.id.toLowerCase()) && 
                                !['bank', 'bacs', 'تحويل', 'حوالة'].some(kw => g.id.toLowerCase().includes(kw) || (g.title && g.title.toLowerCase().includes(kw))))
                      .map(gateway => (
                        <div 
                          key={gateway.id}
                          onClick={() => setPaymentMethod(gateway.id)}
                          className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === gateway.id ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                        >
                          <div className={`w-6 h-6 rounded-full border-4 ${paymentMethod === gateway.id ? "border-red-600 bg-white" : "border-gray-200 bg-white"}`} />
                          <div className="flex-1">
                            <p className="font-bold">{gateway.title}</p>
                            <p className="text-xs text-gray-500">{gateway.description || "طريقة دفع آمنة"}</p>
                          </div>
                        </div>
                      ))
                    }
                  </>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="animate-spin" size={24} />
                  <span>جاري معالجة الطلب...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={24} />
                  <span>
                    {(paymentMethod.toLowerCase().includes("telr") || 
                      paymentMethod.toLowerCase().includes("applepay") || 
                      paymentMethod.toLowerCase().includes("tamara")) 
                      ? "المتابعة للدفع" 
                      : "تأكيد الطلب"}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96">
          <div className="bg-gray-900 text-white rounded-3xl p-8 sticky top-32">
            <h3 className="text-xl font-bold mb-8 border-b border-white/10 pb-4">ملخص الطلب</h3>
            
            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex gap-4">
                  <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden shrink-0">
                    <img src={item.images[0]?.src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                    {item.selectedAttributes && Object.entries(item.selectedAttributes).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selectedAttributes).map(([name, value]) => (
                          <span key={name} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">
                            {name}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">{item.quantity} × {item.price} ر.س</p>
                    <button 
                      onClick={() => onRemoveItem(item.id, item.selectedAttributes)}
                      className="text-[10px] text-red-500 hover:underline mt-1"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="flex justify-between text-gray-400">
                <span>المجموع الفرعي</span>
                <span>{total.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>رسوم التوصيل</span>
                <span className={shippingCost === 0 ? "text-green-400" : "text-white"}>{shippingCost === 0 ? "مجاني" : `${shippingCost.toFixed(2)} ر.س`}</span>
              </div>
              <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/10">
                <span>الإجمالي</span>
                <span className="text-red-500">{finalTotal.toFixed(2)} ر.س</span>
              </div>
            </div>

            {isGatewayEnabled('tamara') && (
              <div className="mt-6 p-4 bg-white/5 rounded-2xl overflow-hidden min-h-[100px] flex flex-col justify-center border border-white/10">
                <div 
                  key={`tamara-checkout-widget-${finalTotal.toFixed(2)}`}
                  className="tamara-cart-widget" 
                  data-lang="ar" 
                  data-price={finalTotal.toFixed(2)} 
                  data-currency="SAR" 
                  data-color-type="dark"
                  data-payment-type="PAY_BY_INSTALMENTS"
                  data-number-of-installments="4"
                  data-country-code="SA"
                ></div>
              </div>
            )}

            <p className="text-[10px] text-gray-500 mt-8 text-center">
              بالضغط على تأكيد الطلب، أنت توافق على شروط وأحكام شركة دروب السلامة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDescription({ html, products, onProductClick }: { html: string, products: Product[], onProductClick: (p: Product) => void }) {
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  
  if (!html) return null;
  
  // Regex to find <a> tags OR plain URLs matching the product pattern
  // We make it more flexible for the domain part
  const urlRegex = /https?:\/\/[^\/\s"]+\/product\/([^/\s"<>]+)\/?/gi;
  const idUrlRegex = /https?:\/\/[^\/\s"]+\/\?product=(\d+)/gi;
  
  let processedHtml = html;
  
  // Combine all known products
  const allKnownProducts = [...products, ...extraProducts];
  const productMap = new Map<string, Product>();
  allKnownProducts.forEach(p => {
    productMap.set(p.slug, p);
    if (p.id) productMap.set(p.id.toString(), p);
  });

  const getThumbnailHtml = (product: Product) => {
    return `___PRODUCT_THUMBNAIL_${product.id}___`;
  };

  // Pass 1: Replace <a> tags
  processedHtml = processedHtml.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
    const slugMatch = href.match(/\/product\/([^/]+)\/?/);
    const idMatch = href.match(/\?product=(\d+)/);
    
    if (slugMatch) {
      try {
        const decodedSlug = decodeURIComponent(slugMatch[1]);
        if (productMap.has(decodedSlug)) return getThumbnailHtml(productMap.get(decodedSlug)!);
        if (productMap.has(slugMatch[1])) return getThumbnailHtml(productMap.get(slugMatch[1])!);
      } catch (e) {
        if (productMap.has(slugMatch[1])) return getThumbnailHtml(productMap.get(slugMatch[1])!);
      }
    }
    
    if (idMatch && productMap.has(idMatch[1])) {
      return getThumbnailHtml(productMap.get(idMatch[1])!);
    }
    return match;
  });

  // Pass 2: Replace plain URLs (slug format)
  processedHtml = processedHtml.replace(urlRegex, (match, slug) => {
    try {
      const decodedSlug = decodeURIComponent(slug);
      if (productMap.has(decodedSlug)) return getThumbnailHtml(productMap.get(decodedSlug)!);
      if (productMap.has(slug)) return getThumbnailHtml(productMap.get(slug)!);
    } catch (e) {
      if (productMap.has(slug)) return getThumbnailHtml(productMap.get(slug)!);
    }
    return match;
  });

  // Pass 3: Replace plain URLs (ID format)
  processedHtml = processedHtml.replace(idUrlRegex, (match, id) => {
    if (productMap.has(id)) return getThumbnailHtml(productMap.get(id)!);
    return match;
  });

  // Effect to fetch missing products
  useEffect(() => {
    const missingSlugs: string[] = [];
    
    // Find slugs in the HTML that aren't in our map
    const matches = html.matchAll(/\/product\/([^/\s"<>]+)\/?/gi);
    for (const match of matches) {
      try {
        const slug = match[1];
        const decodedSlug = decodeURIComponent(slug);
        if (!productMap.has(decodedSlug) && !productMap.has(slug) && !missingSlugs.includes(decodedSlug)) {
          missingSlugs.push(decodedSlug);
        }
      } catch (e) {}
    }

    if (missingSlugs.length > 0) {
      // Fetch missing products one by one or in bulk if API supports it
      // For now, let's try to fetch them to improve the UI
      missingSlugs.forEach(async (slug) => {
        try {
          const res = await fetch(`/api/products?search=${encodeURIComponent(slug)}&per_page=1`);
          const data = await res.json();
          if (Array.isArray(data) && data[0]) {
            setExtraProducts(prev => {
              if (prev.some(p => p.id === data[0].id)) return prev;
              return [...prev, data[0]];
            });
          }
        } catch (error) {
          console.error("Error fetching missing product:", error);
        }
      });
    }
  }, [html, products.length]);

  const parts = processedHtml.split(/(___PRODUCT_THUMBNAIL_\d+___)/g);
  
  const elements = parts.map((part, index) => {
    const match = part.match(/___PRODUCT_THUMBNAIL_(\d+)___/);
    if (match) {
      const productId = parseInt(match[1]);
      const linkedProduct = allKnownProducts.find(p => p.id === productId);
      if (linkedProduct) {
        return (
          <div 
            key={`product-thumb-${index}`}
            onClick={() => onProductClick(linkedProduct)}
            className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-2xl hover:border-red-200 hover:shadow-lg hover:shadow-red-50/50 transition-all cursor-pointer my-4 group w-full max-w-md"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-50">
              <img 
                src={linkedProduct.images[0]?.src || "https://picsum.photos/seed/safety/200"} 
                alt={linkedProduct.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-red-600 font-bold uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse"></div>
                منتج ذو صلة
              </span>
              <span className="text-sm font-bold text-gray-900 leading-tight truncate mb-1">{linkedProduct.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-red-600">{linkedProduct.price} ر.س</span>
                <span className="text-[10px] text-gray-400 font-medium">عرض التفاصيل ←</span>
              </div>
            </div>
          </div>
        );
      }
    }
    return <span key={`html-part-${index}`} dangerouslySetInnerHTML={{ __html: part }} />;
  });

  return <div className="prose prose-sm text-gray-600 mb-10 leading-relaxed max-w-none">{elements}</div>;
}

function ProductModal({ product, isOpen, onClose, onAddToCart, isFavorite, onToggleFavorite, allProducts, onProductClick }: { 
  product: Product | null, 
  isOpen: boolean, 
  onClose: () => void,
  onAddToCart: (p: Product, selectedAttributes?: { [key: string]: string }) => void,
  isFavorite: boolean,
  onToggleFavorite: () => void,
  allProducts: Product[],
  onProductClick: (p: Product) => void
}) {
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
    if (product && product.attributes) {
      const initialAttrs: { [key: string]: string } = {};
      product.attributes.forEach(attr => {
        if (attr.options && attr.options.length > 0) {
          initialAttrs[attr.name] = attr.options[0];
        }
      });
      setSelectedAttributes(initialAttrs);
    } else {
      setSelectedAttributes({});
    }
  }, [product]);

  // Switch image based on attribute selection
  useEffect(() => {
    if (product && product.images && product.images.length > 1 && Object.keys(selectedAttributes).length > 0) {
      const selectedValues = Object.values(selectedAttributes).map(v => (v as string).toLowerCase());
      const matchingImageIndex = product.images.findIndex(img => 
        selectedValues.some(val => 
          (img.name && img.name.toLowerCase().includes(val)) || 
          (img.alt && img.alt.toLowerCase().includes(val))
        )
      );
      if (matchingImageIndex !== -1) {
        setCurrentImageIndex(matchingImageIndex);
      }
    }
  }, [selectedAttributes, product]);

  // Tamara Widget Logic
  useEffect(() => {
    if (isOpen && product) {
      const initTamara = () => {
        // @ts-ignore
        const tamaraV2 = window.TamaraWidgetV2;
        if (tamaraV2) {
          if (typeof tamaraV2.refresh === 'function') {
            tamaraV2.refresh();
          } else if (typeof tamaraV2.init === 'function') {
            tamaraV2.init();
          }
        }
        
        // Render if refresh didn't work
        // @ts-ignore
        if (window.tamara && window.tamara.widget && typeof window.tamara.widget.render === 'function') {
          // @ts-ignore
          window.tamara.widget.render();
        }
      };

      // Try multiple times as the modal animation might delay DOM availability
      const timers = [300, 800, 1500, 2500, 4000].map(delay => setTimeout(initTamara, delay));
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isOpen, product]);

  if (!product) return null;

  const cleanPrice = product.price ? parseFloat(product.price.toString().replace(/[^\d.]/g, '')).toFixed(2) : "0.00";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:max-h-[90vh] bg-white z-[70] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg z-20 hover:bg-red-600 hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-1/2 h-80 md:h-auto relative bg-gray-50 flex flex-col">
              <div className="flex-1 relative overflow-hidden">
                <img 
                  src={product.images[currentImageIndex]?.src || "https://picsum.photos/seed/safety/800"} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={onToggleFavorite}
                  className={`absolute top-4 left-4 p-3 rounded-full shadow-xl transition-all z-10 ${isFavorite ? "bg-red-600 text-white" : "bg-white text-gray-400 hover:text-red-600"}`}
                >
                  <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
              
              {/* Image Gallery Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="p-4 bg-white/50 backdrop-blur-sm flex gap-2 overflow-x-auto no-scrollbar">
                  {product.images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                        currentImageIndex === idx ? "border-red-600 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img.src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 p-6 md:p-10 overflow-y-auto">
              <div className="text-sm text-red-600 font-bold mb-2 uppercase tracking-wider">
                {product.categories[0]?.name}
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-6 leading-tight">
                {product.name}
              </h2>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-black text-red-700">
                  {product.price} <span className="text-lg font-bold">ر.س</span>
                </div>
                {product.on_sale && (
                  <div className="text-xl text-gray-400 line-through">
                    {product.regular_price} ر.س
                  </div>
                )}
              </div>

              {/* Tamara Promotional Widget */}
              <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[140px] flex flex-col justify-center">
                <div 
                  key={`tamara-product-widget-${product.id}-${isOpen}-${cleanPrice}`}
                  className="tamara-product-widget" 
                  data-lang="ar" 
                  data-price={cleanPrice} 
                  data-currency="SAR" 
                  data-payment-type="PAY_BY_INSTALMENTS"
                  data-number-of-installments="4"
                  data-disable-pay-later="false"
                  data-public-key="5efe5280-6e1a-4b47-a18f-f245f4ff684f"
                  data-country-code="SA"
                ></div>
                <div className="mt-2 text-[10px] text-gray-400 text-center font-medium">
                  متوافقة مع الشريعة الإسلامية
                </div>
              </div>

              {/* Attributes Selection */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="space-y-6 mb-8">
                  {product.attributes.map(attr => (
                    <div key={attr.id || attr.name} className="space-y-3">
                      <label className="text-sm font-bold text-gray-700">{attr.name}</label>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map(option => (
                          <button
                            key={option}
                            onClick={() => setSelectedAttributes(prev => ({ ...prev, [attr.name]: option }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                              selectedAttributes[attr.name] === option
                                ? "border-red-600 bg-red-50 text-red-600"
                                : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ProductDescription 
                html={product.description} 
                products={allProducts} 
                onProductClick={onProductClick} 
              />

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { onAddToCart(product, selectedAttributes); onClose(); }}
                  className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                >
                  <ShoppingCart size={24} /> أضف للسلة
                </button>
                <button 
                  onClick={() => {
                    const attrText = Object.entries(selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ');
                    const message = `السلام عليكم، أرغب في الاستفسار عن منتج: ${product.name}\n${attrText ? `الخيارات المختارة: ${attrText}\n` : ''}السعر: ${product.price} ر.س\nالرابط: ${window.location.origin}/?product=${product.id}`;
                    window.open(`https://wa.me/966580410063?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-3"
                >
                  <MessageCircle size={24} /> واتساب
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LoginModal({ isOpen, onClose, onGoogleLogin }: { isOpen: boolean, onClose: () => void, onGoogleLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  useEffect(() => {
    let verifier: any = null;

    const setup = async () => {
      if (isOpen && isPhoneMode && recaptchaContainerRef.current) {
        try {
          // Clear container to prevent duplicate rendering
          recaptchaContainerRef.current.innerHTML = '<div id="recaptcha-verifier-container"></div>';
          
          const verifierElement = document.getElementById('recaptcha-verifier-container');
          if (!verifierElement) return;

          verifier = new RecaptchaVerifier(auth, verifierElement, {
            'size': 'invisible',
            'callback': () => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
              if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                setup();
              }
            }
          });
          
          recaptchaVerifierRef.current = verifier;
          await verifier.render();
        } catch (error) {
          console.error("Recaptcha setup error:", error);
        }
      }
    };

    setup();

    return () => {
      if (verifier) {
        try {
          verifier.clear();
        } catch (e) {
          console.error("Error clearing recaptcha:", e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, [isOpen, isPhoneMode]);

  if (!isOpen) return null;

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    let formattedPhone = phoneNumber.trim();
    
    // Auto-format for Saudi Arabia (+966)
    if (!formattedPhone.startsWith('+')) {
      // If starts with 05, remove 0 and add +966
      if (formattedPhone.startsWith('05')) {
        formattedPhone = '+966' + formattedPhone.substring(1);
      } 
      // If starts with 5, add +966
      else if (formattedPhone.startsWith('5')) {
        formattedPhone = '+966' + formattedPhone;
      }
      // If it's just numbers, assume it's a local number and add +966
      else if (/^\d+$/.test(formattedPhone)) {
        formattedPhone = '+966' + formattedPhone;
      }
    }

    if (!formattedPhone.startsWith('+')) {
      alert("يرجى إدخال رقم الجوال بشكل صحيح (مثال: 0500000000)");
      return;
    }

    setLoading(true);
    try {
      // If we already have a verifier, try to reset it to be safe
      if (recaptchaVerifierRef.current) {
        try {
          // Some versions of Firebase might throw if we clear and then use, 
          // so we just ensure it's rendered.
          await recaptchaVerifierRef.current.render();
        } catch (e) {
          console.warn("Recaptcha render warning:", e);
        }
      }

      const appVerifier = recaptchaVerifierRef.current;
      if (!appVerifier) throw new Error("Recaptcha not initialized");
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowOTP(true);
    } catch (error: any) {
      console.error("Phone auth error:", error);
      
      // If error is -39, it's often a recaptcha issue, try to clear it for the next attempt
      if (error.code === 'auth/internal-error' || error.message?.includes('-39')) {
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
          } catch (e) {
            console.error("Error clearing recaptcha after -39:", e);
          }
        }
        // Force a re-setup of recaptcha
        setTimeout(() => {
          setIsPhoneMode(false);
          setTimeout(() => setIsPhoneMode(true), 100);
        }, 100);
      }

      let message = "حدث خطأ في إرسال الرمز. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/invalid-phone-number') message = "رقم الجوال غير صحيح.";
      if (error.code === 'auth/too-many-requests') message = "تم إرسال الكثير من الطلبات، يرجى المحاولة لاحقاً.";
      if (error.code === 'auth/unauthorized-domain') message = "هذا النطاق (Domain) غير مصرح له باستخدام خدمة التحقق بالجوال. يرجى التأكد من إضافة droubalsalamah.com و www.droubalsalamah.com في لوحة تحكم Firebase.";
      if (error.code === 'auth/internal-error' || error.message.includes('-39')) {
        message = "حدث خطأ في نظام التحقق. يرجى المحاولة مرة أخرى أو تحديث الصفحة.";
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
      }
      
      // Show error code for debugging if it's something else
      if (!['auth/invalid-phone-number', 'auth/too-many-requests', 'auth/unauthorized-domain', 'auth/internal-error'].includes(error.code)) {
        message += ` (Error Code: ${error.code})`;
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      onClose();
    } catch (error: any) {
      alert("الرمز غير صحيح، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isResetMode) {
        await sendPasswordResetEmail(auth, email);
        alert("تم إرسال رابط استعادة كلمة المرور لبريدك الإلكتروني.");
        setIsResetMode(false);
      } else if (isRegisterMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (error: any) {
      let message = "حدث خطأ ما، يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/email-already-in-use') message = "هذا البريد الإلكتروني مستخدم بالفعل.";
      if (error.code === 'auth/invalid-email') message = "البريد الإلكتروني غير صحيح.";
      if (error.code === 'auth/weak-password') message = "كلمة المرور ضعيفة جداً.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setIsResetMode(false);
    setIsPhoneMode(false);
    setShowOTP(false);
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
  };

  const togglePhoneMode = () => {
    setIsPhoneMode(!isPhoneMode);
    setIsRegisterMode(false);
    setIsResetMode(false);
    setShowOTP(false);
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div ref={recaptchaContainerRef}></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isPhoneMode ? <Phone className="text-red-600" size={32} /> : <User className="text-red-600" size={32} />}
          </div>
          <h2 className="text-2xl font-bold">
            {showOTP ? "تحقق من الرمز" : (isPhoneMode ? "تسجيل الدخول بالجوال" : (isResetMode ? "استعادة كلمة المرور" : (isRegisterMode ? "إنشاء حساب جديد" : "تسجيل الدخول")))}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {showOTP ? "أدخل الرمز المرسل إلى جوالك" : (isPhoneMode ? "أدخل رقم جوالك للمتابعة" : (isResetMode ? "أدخل بريدك الإلكتروني لاستلام رابط الاستعادة" : (isRegisterMode ? "انضم إلينا في دروب السلامة" : "أهلاً بك مجدداً في دروب السلامة")))}
          </p>
        </div>

        {isPhoneMode ? (
          <form onSubmit={showOTP ? handleVerifyOTP : handlePhoneSubmit} className="space-y-4">
            {!showOTP ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">رقم الجوال</label>
                <input 
                  type="tel" 
                  required
                  dir="ltr"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all text-left" 
                  placeholder="05XXXXXXXX"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">رمز التحقق</label>
                <input 
                  type="text" 
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all text-center tracking-[1em] font-bold" 
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Clock className="animate-spin" /> : null}
              {showOTP ? "تحقق" : "إرسال الرمز"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">الاسم الكامل</label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                  placeholder="أدخل اسمك"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">البريد الإلكتروني</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                placeholder="example@mail.com"
              />
            </div>
            
            {!isResetMode && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">كلمة المرور</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                  placeholder="••••••••"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Clock className="animate-spin" /> : null}
              {isResetMode ? "إرسال رابط الاستعادة" : (isRegisterMode ? "إنشاء الحساب" : "دخول")}
            </button>
          </form>
        )}

        {!isResetMode && !showOTP && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <span className="relative bg-white px-4 text-xs text-gray-400 font-bold uppercase tracking-widest">أو</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={onGoogleLogin}
                className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                الدخول بواسطة جوجل
              </button>

              <button 
                onClick={togglePhoneMode}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-3"
              >
                <Phone size={20} />
                {isPhoneMode ? "الدخول بالبريد الإلكتروني" : "الدخول برقم الجوال"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 text-center">
          {!isPhoneMode && (
            <button 
              onClick={() => setIsResetMode(!isResetMode)}
              className="text-sm text-red-600 font-bold hover:underline"
            >
              {isResetMode ? "العودة لتسجيل الدخول" : "نسيت كلمة المرور؟"}
            </button>
          )}
          
          <button 
            onClick={toggleMode}
            className="text-sm text-gray-500 font-medium"
          >
            {isRegisterMode ? (
              <>لديك حساب بالفعل؟ <span className="text-red-600 font-bold hover:underline">سجل دخولك</span></>
            ) : (
              <>ليس لديك حساب؟ <span className="text-red-600 font-bold hover:underline">أنشئ حساباً جديداً</span></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

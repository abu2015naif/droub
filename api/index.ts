import express from "express";
import path from "path";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";
import fs from "fs";
import cors from "cors";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

async function startServer() {
  const WC = (WooCommerceRestApi as any).default || WooCommerceRestApi;
  // Force the correct API URL provided by the user
  let siteUrl = "https://api.droubalsalamah.com";
  // Remove trailing slashes
  siteUrl = siteUrl.replace(/\/+$/, "");
  
  console.log("Initializing WooCommerce with URL:", siteUrl);
  
  const consumerKey = "ck_8568a5b756c43e80c76d3a75eb4660c1450f24ac";
  const consumerSecret = "cs_2a01a6b56e4ac796a07d75dfbfdaa0b1367c28f2";

  if (!consumerKey || !consumerSecret) {
    console.warn("⚠️ WooCommerce API Keys are missing! Please check your environment variables.");
  }

  let WooCommerce: any;
  try {
    WooCommerce = new WC({
      url: siteUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: "wc/v3",
      queryStringAuth: false, // Use Basic Auth for HTTPS
      timeout: 60000,
      axiosConfig: {
        headers: {
          'User-Agent': 'WooCommerce-Rest-API-Client/1.0'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    });

    // Test connection on startup
    console.log("🔍 Testing WooCommerce connection...");
    WooCommerce.get("products", { per_page: 1 })
      .then((response: any) => {
        console.log("✅ WooCommerce connection successful! Found", response.headers['x-wp-total'], "products.");
      })
      .catch((err: any) => {
        console.error("❌ WooCommerce connection test failed!");
        console.error("Error details:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          console.error("Check if your API keys have the correct permissions (Read/Write).");
        } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          console.error("Could not reach the server. Check the URL.");
        }
      });

  } catch (err: any) {
    console.error("❌ Failed to initialize WooCommerce SDK:", err.message);
  }

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Middleware to check if WooCommerce is initialized
  app.use((req, res, next) => {
    if (!WooCommerce && req.path.startsWith("/api/")) {
      return res.status(503).json({ error: "WooCommerce SDK not initialized" });
    }
    next();
  });

  // API Routes
  app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url} (Path: ${req.path})`);
    next();
  });

      // Simple in-memory cache
      const cache: { [key: string]: { data: any, timestamp: number } } = {};
      const CACHE_TTL = 1000 * 60 * 10; // 10 minutes
      const SHORT_CACHE_TTL = 1000 * 30; // 30 seconds for dynamic data

      const getCachedData = (key: string, ttl: number = CACHE_TTL) => {
        const cached = cache[key];
        if (cached && Date.now() - cached.timestamp < ttl) {
          return cached.data;
        }
        return null;
      };

  const setCachedData = (key: string, data: any) => {
    cache[key] = { data, timestamp: Date.now() };
  };

  app.get("/api/debug/woocommerce", async (req, res) => {
    try {
      console.log("🔍 Debug: Testing connection to", siteUrl);
      const response = await WooCommerce.get("products", { per_page: 1 });
      
      // Check if response is HTML (common when hitting a frontend instead of API)
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        return res.status(500).json({
          status: "error",
          message: "Received HTML instead of JSON. You might be hitting the frontend instead of the API.",
          url: siteUrl,
          contentType: contentType,
          preview: typeof response.data === 'string' ? response.data.substring(0, 200) : "Not a string"
        });
      }

      res.json({
        status: "success",
        url: siteUrl,
        productCount: response.headers['x-wp-total'],
        headers: response.headers,
        sampleData: Array.isArray(response.data) && response.data[0] ? { id: response.data[0].id, name: response.data[0].name } : null
      });
    } catch (error: any) {
      console.error("❌ Debug: Connection failed", error.message);
      res.status(500).json({
        status: "error",
        url: siteUrl,
        error: error.message,
        details: error.response?.data || "No response data",
        status_code: error.response?.status,
        axios_error: error.code
      });
    }
  });

  // Media Upload Route
  app.post("/api/media", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`📡 Uploading media to WordPress: ${req.file.originalname} (${req.file.mimetype})`);
      
      const wpUser = process.env.WP_USERNAME || "khaled4ever";
      // Support both WP_APP_KEY (requested) and WP_APP_PASS
      const rawPass = process.env.WP_APP_KEY || process.env.WP_APP_PASS;
      const wpPass = rawPass ? rawPass.replace(/\s+/g, '') : null;

      if (!wpPass) {
        return res.status(400).json({ error: "الرجاء إضافة مفتاح التطبيق (WP_APP_KEY) في إعدادات التطبيق (Secrets)." });
      }

      console.log(`📡 Attempting WordPress Media Upload...`);
      console.log(`👤 Using Identity: ${wpUser}`);

      // Using Basic Auth with WordPress Application Passwords
      const authHeader = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');

      const response = await axios.post(`${siteUrl}/wp-json/wp/v2/media`, req.file.buffer, {
        headers: {
          'Content-Type': req.file.mimetype,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(req.file.originalname)}"`,
          'Authorization': `Basic ${authHeader}`
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      console.log(`✅ Media uploaded successfully. ID: ${response.data.id}`);
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data;
      const status = error.response?.status;
      const wpUser = process.env.WP_USERNAME || "khaled4ever";
      
      console.error(`❌ WordPress Media API Error [${status}]:`, JSON.stringify(errorData, null, 2) || error.message);
      
      let customError = "فشل رفع الصورة لووردبريس";
      if (errorData?.message) {
        // Strip HTML tags if present
        customError = errorData.message.replace(/<[^>]*>?/gm, '');
        
        // Detailed troubleshooting for "Unknown username"
        if (customError.includes("Unknown username") || customError.includes("اسم مستخدم غير معروف")) {
          customError = `خطأ: اسم المستخدم (${wpUser}) غير معروف في ووردبريس. جرب استخدام بريدك الإلكتروني بدلاً من الاسم في خانة WP_USERNAME.`;
        }
      } else if (status === 401) {
        customError = "فشل التحقق: اسم المستخدم أو كلمة مرور التطبيق (Application Password) غير صحيحة.";
      } else if (status === 403) {
        customError = "خطأ في الصلاحيات: هذا المستخدم لا يمتلك صلاحية لرفع الملفات.";
      }

      res.status(status || 500).json({ 
        error: customError,
        details: errorData || error.message 
      });
    }
  });

  app.get(["/api/products", "/products"], async (req, res) => {
    try {
      const { per_page = 20, page = 1, category, search, featured, orderby, order } = req.query;
      const cacheKey = `products-${per_page}-${page}-${category || 'all'}-${search || 'none'}-${featured || 'all'}-${orderby || 'date'}-${order || 'desc'}`;
      
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      const response = await WooCommerce.get("products", {
        per_page,
        page,
        category,
        search,
        featured: featured === 'true' ? true : undefined,
        orderby: orderby || "date",
        order: order || "desc",
        status: "publish"
      });
      
      setCachedData(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      let errorData = error.response?.data || error.message;
      
      // If the error data is HTML (starts with <), it means the WP site returned a web page instead of JSON
      if (typeof errorData === 'string' && errorData.trim().startsWith('<')) {
        console.error("❌ WooCommerce returned HTML instead of JSON. Check your URL and Permalinks.");
        errorData = { message: "WordPress returned an HTML error page. This usually means the API URL is incorrect or Permalinks are not enabled.", htmlSnippet: errorData.substring(0, 200) };
      }

      console.error("❌ WooCommerce API Error (Products):", errorData);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to fetch products",
        details: errorData 
      });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const cacheKey = "categories-all";
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      const response = await WooCommerce.get("products/categories", {
        per_page: 100,
        hide_empty: true
      });
      
      setCachedData(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      let errorData = error.response?.data || error.message;

      if (typeof errorData === 'string' && errorData.trim().startsWith('<')) {
        errorData = { message: "WordPress returned an HTML error page.", htmlSnippet: errorData.substring(0, 200) };
      }

      console.error("❌ WooCommerce API Error (Categories):", errorData);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to fetch categories",
        details: errorData
      });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const cacheKey = `product-${req.params.id}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      const response = await WooCommerce.get(`products/${req.params.id}`);
      setCachedData(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Product Detail):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch product details" });
    }
  });

  app.get("/api/products/:id/variations", async (req, res) => {
    try {
      const cacheKey = `product-${req.params.id}-variations`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      const response = await WooCommerce.get(`products/${req.params.id}/variations`, {
        per_page: 100
      });
      setCachedData(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Product Variations):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch product variations" });
    }
  });

  const clearProductCache = () => {
    // Clear all product-related cache keys
    Object.keys(cache).forEach(key => {
      if (key.startsWith('products-') || key.startsWith('product-')) {
        delete cache[key];
      }
    });
    console.log("Product cache cleared due to update/create/delete");
  };

  app.post("/api/products", async (req, res) => {
    try {
      console.log("📝 Creating new product in WooCommerce...");
      console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
      
      const response = await WooCommerce.post("products", req.body);
      
      console.log("✅ Product created successfully. ID:", response.data.id);
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("❌ WooCommerce API Error (Create Product):", JSON.stringify(error.response?.data, null, 2) || error.message);
      res.status(500).json({ error: "Failed to create product", details: error.response?.data });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.featured !== undefined) {
        updateData.featured = updateData.featured === true || String(updateData.featured) === "true";
      }
      
      console.log(`📡 Updating product ${req.params.id}...`);
      console.log("📦 Update Payload:", JSON.stringify(updateData, null, 2));
      
      const response = await WooCommerce.put(`products/${req.params.id}`, updateData);
      
      console.log(`✅ Product ${req.params.id} updated successfully.`);
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error(`❌ WooCommerce API Error (Update Product ${req.params.id}):`, JSON.stringify(error.response?.data, null, 2) || error.message);
      res.status(500).json({ error: "Failed to update product", details: error.response?.data });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      console.log(`📡 Attempting to delete product ${req.params.id}...`);
      const response = await WooCommerce.delete(`products/${req.params.id}`, {
        force: true // Permanently delete
      });
      
      console.log(`✅ Product ${req.params.id} deleted successfully.`);
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error(`❌ WooCommerce API Error (Delete Product ${req.params.id}):`, JSON.stringify(error.response?.data, null, 2) || error.message);
      res.status(500).json({ 
        error: "Failed to delete product", 
        details: error.response?.data || error.message 
      });
    }
  });

  // Order Routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { per_page = 20, page = 1, status } = req.query;
      const cacheKey = `orders-${per_page}-${page}-${status || 'all'}`;
      
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      const response = await WooCommerce.get("orders", {
        per_page,
        page,
        status
      });
      
      setCachedData(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Orders):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  const clearOrderCache = () => {
    Object.keys(cache).forEach(key => {
      if (key.startsWith('orders-')) {
        delete cache[key];
      }
    });
    console.log("Order cache cleared due to update/create");
  };

  app.post("/api/orders", async (req, res) => {
    try {
      console.log("📝 Creating new order in WooCommerce...");
      console.log("📦 Order Data:", JSON.stringify(req.body, null, 2));
      
      const response = await WooCommerce.post("orders", req.body);
      
      console.log("✅ WooCommerce Order Created successfully. ID:", response.data.id);
      clearOrderCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("❌ WooCommerce API Error (Create Order):", JSON.stringify(error.response?.data, null, 2) || error.message);
      res.status(500).json({ 
        error: "Failed to create order", 
        message: error.response?.data?.message || error.message,
        details: error.response?.data 
      });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      console.log(`📡 Updating order ${req.params.id}...`);
      console.log("📦 Update Payload:", JSON.stringify(req.body, null, 2));
      
      const response = await WooCommerce.put(`orders/${req.params.id}`, req.body);
      
      console.log(`✅ Order ${req.params.id} updated successfully.`);
      clearOrderCache();
      res.json(response.data);
    } catch (error: any) {
      console.error(`❌ WooCommerce API Error (Update Order ${req.params.id}):`, JSON.stringify(error.response?.data, null, 2) || error.message);
      res.status(500).json({ 
        error: "Failed to update order", 
        message: error.response?.data?.message || error.message,
        details: error.response?.data 
      });
    }
  });

  // Telr Payment Routes
  app.post("/api/payment/telr", async (req, res) => {
    try {
      const { orderId, amount, currency, customer, returnUrl, cancelUrl, payMethod } = req.body;
      
      console.log("📡 Received Telr payment request body:", JSON.stringify(req.body, null, 2));
      
      // Use credentials from user screenshot as defaults if env vars are missing
      const storeId = (process.env.TELR_STORE_ID || "30349").trim();
      const apiKey = (process.env.TELR_API_KEY || "Z7TjQ~XFDJ@d6N5R").trim();
      const testMode = process.env.TELR_TEST_MODE === "1" ? "1" : "0";

      if (!storeId || !apiKey) {
        return res.status(500).json({ error: "Telr configuration missing" });
      }

      // Validate amount
      if (amount === undefined || amount === null || amount === "") {
        console.error("❌ Amount is missing or empty in request body");
        return res.status(400).json({ error: "Amount is required" });
      }

      const numAmount = parseFloat(amount.toString());
      console.log(`📡 Received Telr payment request for Order #${orderId}`);
      console.log(`   Amount: ${numAmount} (Original: "${amount}", Type: ${typeof amount})`);
      
      if (isNaN(numAmount) || numAmount <= 0) {
        console.error(`❌ Invalid amount calculation: ${numAmount} (Original: ${amount})`);
        return res.status(400).json({ 
          error: "Invalid amount provided", 
          receivedAmount: amount,
          parsedAmount: numAmount 
        });
      }
      
      const formattedAmount = numAmount.toFixed(2);
      const formattedCurrency = (currency || "SAR").toUpperCase();

      // Manually construct the body to have full control over encoding
      const data: Record<string, string> = {
        ivp_method: "create",
        ivp_store: storeId,
        ivp_authkey: apiKey,
        ivp_cart: orderId.toString(),
        ivp_test: testMode,
        ivp_amount: formattedAmount,
        ivp_currency: formattedCurrency,
        ivp_desc: `Order #${orderId}`,
        ivp_trantype: "sale",
        ivp_lang: "ar",
        return_auth: returnUrl,
        return_can: cancelUrl,
        return_decl: cancelUrl,
        ivp_return_auth: returnUrl,
        ivp_return_can: cancelUrl,
        ivp_return_decl: cancelUrl,
        bill_fname: customer.firstName || "Customer",
        bill_sname: customer.lastName || "Name",
        bill_addr1: customer.address || "N/A",
        bill_city: customer.city || "Riyadh",
        bill_country: "SA",
        bill_email: customer.email,
        bill_phone: customer.phone || "0000000000"
      };

      // Construct the form-urlencoded string manually
      const body = Object.entries(data)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      // Use the WordPress site as a proxy to bypass Telr IP whitelisting issues on Vercel
      const proxyUrl = "https://api.droubalsalamah.com/telr-proxy.php";
      
      console.log(`📡 Initiating Telr payment via Proxy for Order #${orderId}, Amount: ${formattedAmount} ${formattedCurrency}`);
      console.log(`   Proxy URL: ${proxyUrl}`);

      const response = await axios.post(proxyUrl, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
      
      console.log("📡 Telr API Raw Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.order && response.data.order.url) {
        console.log(`✅ Telr payment initiated successfully for Order #${orderId}. Ref: ${response.data.order.ref}`);
        res.json({ url: response.data.order.url, ref: response.data.order.ref });
      } else {
        console.error("❌ Telr API Error Response:", JSON.stringify(response.data, null, 2));
        const errorMsg = response.data.error?.note || response.data.error?.message || "Request authentication failed. Please check your Telr Store ID and API Key.";
        res.status(400).json({ error: errorMsg, details: response.data });
      }
    } catch (error: any) {
      console.error("Telr API Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Telr API Error", details: error.response?.data || error.message });
    }
  });

  app.get("/api/payment/telr/check/:ref", async (req, res) => {
    try {
      const { ref } = req.params;
      const storeId = process.env.TELR_STORE_ID || "30349";
      const apiKey = process.env.TELR_API_KEY || "Z7TjQ~XFDJ@d6N5R";

      if (!storeId || !apiKey) {
        return res.status(500).json({ error: "Telr configuration missing" });
      }

      const params = new URLSearchParams();
      params.append("ivp_method", "check");
      params.append("ivp_store", storeId.trim());
      params.append("ivp_authkey", apiKey.trim());
      params.append("order_ref", ref);

      const response = await axios.post("https://secure.telr.com/gateway/order.json", params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Telr Check Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to check Telr payment status" });
    }
  });

  // Tamara Payment Gateway Integration
  app.post("/api/payment/tamara/checkout", async (req, res) => {
    try {
      const { orderId, amount, currency, customer, items, shippingAmount, returnUrl, cancelUrl } = req.body;
      const apiToken = process.env.TAMARA_API_TOKEN;
      const apiUrl = process.env.TAMARA_API_URL || "https://api.tamara.co";

      if (!apiToken) {
        console.error("❌ Tamara API Token is missing in environment variables.");
        return res.status(500).json({ error: "Tamara configuration missing (API Token)" });
      }

      console.log(`📡 Initiating Tamara checkout for Order #${orderId}, Amount: ${amount} ${currency}`);

      // Format phone number for Tamara (expects 966...)
      let phone = customer.phone || "500000000";
      phone = phone.replace(/\s+/g, ''); // Remove spaces
      if (phone.startsWith('05')) {
        phone = '966' + phone.substring(1);
      } else if (phone.startsWith('5')) {
        phone = '966' + phone;
      } else if (phone.startsWith('+966')) {
        phone = phone.substring(1);
      } else if (!phone.startsWith('966')) {
        phone = '966' + phone;
      }

      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host;
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

      const tamaraData = {
        order_reference_id: orderId.toString(),
        total_amount: {
          amount: parseFloat(amount),
          currency: (currency || "SAR").toUpperCase()
        },
        shipping_amount: {
          amount: parseFloat(shippingAmount || "0"),
          currency: (currency || "SAR").toUpperCase()
        },
        tax_amount: {
          amount: 0,
          currency: (currency || "SAR").toUpperCase()
        },
        discount_amount: {
          amount: 0,
          currency: (currency || "SAR").toUpperCase()
        },
        description: `Order #${orderId} from Droub Al Salamah`,
        country_code: "SA",
        payment_type: "PAY_BY_INSTALMENTS",
        locale: "ar_SA",
        items: items.map((item: any) => ({
          name: item.name || "Product",
          type: "Physical",
          reference_id: item.id?.toString() || "0",
          sku: item.sku || item.id?.toString() || "0",
          quantity: item.quantity || 1,
          unit_price: {
            amount: parseFloat(item.price || "0"),
            currency: (currency || "SAR").toUpperCase()
          },
          total_amount: {
            amount: parseFloat(item.price || "0") * (item.quantity || 1),
            currency: (currency || "SAR").toUpperCase()
          }
        })),
        consumer: {
          first_name: customer.firstName || "Customer",
          last_name: customer.lastName || "Name",
          phone_number: phone,
          email: customer.email || "customer@example.com"
        },
        shipping_address: {
          first_name: customer.firstName || "Customer",
          last_name: customer.lastName || "Name",
          line1: customer.address || "N/A",
          city: customer.city || "Riyadh",
          country_code: "SA",
          phone_number: phone
        },
        billing_address: {
          first_name: customer.firstName || "Customer",
          last_name: customer.lastName || "Name",
          line1: customer.address || "N/A",
          city: customer.city || "Riyadh",
          country_code: "SA",
          phone_number: phone
        },
        merchant_url: {
          success: returnUrl,
          failure: cancelUrl,
          cancel: cancelUrl,
          notification: `${baseUrl}/api/payment/tamara/webhook`
        }
      };

      console.log("📡 Tamara Payload:", JSON.stringify(tamaraData, null, 2));

      const response = await axios.post(`${apiUrl}/checkout`, tamaraData, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log("✅ Tamara Checkout Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.checkout_url) {
        res.json({ url: response.data.checkout_url, orderId: response.data.order_id });
      } else {
        console.error("❌ Tamara API Error: No checkout URL returned", response.data);
        res.status(400).json({ error: "Failed to get checkout URL from Tamara", details: response.data });
      }
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message;
      console.error("❌ Tamara API Error:", JSON.stringify(errorDetail, null, 2));
      res.status(500).json({ 
        error: "Tamara API Error", 
        message: error.response?.data?.message || error.message,
        details: errorDetail 
      });
    }
  });

  // Tamara Webhook Handler
  app.post("/api/payment/tamara/webhook", async (req, res) => {
    try {
      const { order_id, status, order_reference_id } = req.body;
      console.log(`🔔 Received Tamara Webhook: Order #${order_reference_id}, Status: ${status}`);

      if (status === 'authorised' || status === 'fully_captured') {
        // Update WooCommerce order status
        await WooCommerce.put(`orders/${order_reference_id}`, {
          status: 'processing',
          set_paid: true,
          customer_note: `تم تأكيد الدفع عبر تمارا. رقم عملية تمارا: ${order_id}`
        });
        console.log(`✅ WooCommerce Order #${order_reference_id} updated to processing.`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("❌ Tamara Webhook Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Tabby Payment Gateway Integration
  app.post("/api/payment/tabby/checkout", async (req, res) => {
    try {
      const { orderId, amount, currency, customer, items, shippingAmount, returnUrl, cancelUrl } = req.body;
      const secretKey = process.env.TABBY_SECRET_KEY;
      const apiUrl = process.env.TABBY_API_URL || "https://api.tabby.ai/api/v2";

      if (!secretKey) {
        console.error("❌ Tabby Secret Key is missing in environment variables.");
        return res.status(500).json({ error: "Tabby configuration missing (Secret Key)" });
      }

      console.log(`📡 Initiating Tabby checkout for Order #${orderId}, Amount: ${amount} ${currency}`);

      // Format phone number (expects +966...)
      let phone = customer.phone || "500000000";
      phone = phone.replace(/\s+/g, '');
      if (phone.startsWith('05')) {
        phone = '+966' + phone.substring(1);
      } else if (phone.startsWith('5')) {
        phone = '+966' + phone;
      } else if (!phone.startsWith('+')) {
        phone = '+966' + phone;
      }

      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host;
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

      const tabbyData = {
        payment: {
          amount: parseFloat(amount).toFixed(2),
          currency: (currency || "SAR").toUpperCase(),
          description: `Order #${orderId} from Droub Al Salamah`,
          buyer: {
            phone: phone,
            email: customer.email || "customer@example.com",
            name: `${customer.firstName} ${customer.lastName}`
          },
          shipping_address: {
            city: customer.city || "Riyadh",
            address: customer.address || "N/A",
            zip: "12345"
          },
          order: {
            tax_amount: "0.00",
            shipping_amount: parseFloat(shippingAmount || "0").toFixed(2),
            discount_amount: "0.00",
            updated_at: new Date().toISOString(),
            reference_id: orderId.toString(),
            items: items.map((item: any) => ({
              title: item.name || "Product",
              description: item.name || "Product",
              quantity: item.quantity || 1,
              unit_price: parseFloat(item.price || "0").toFixed(2),
              discount_amount: "0.00",
              reference_id: item.id?.toString() || "0",
              ordered: item.quantity || 1,
              captured: 0,
              shipped: 0,
              refunded: 0,
              gender: "NA",
              category: "Safety"
            }))
          }
        },
        lang: "ar",
        webhook_url: `${baseUrl}/api/payment/tabby/webhook`,
        merchant_urls: {
          success: returnUrl,
          cancel: cancelUrl,
          failure: cancelUrl
        }
      };

      console.log("📡 Tabby Payload:", JSON.stringify(tabbyData, null, 2));

      const response = await axios.post(`${apiUrl}/checkout`, tabbyData, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("✅ Tabby Checkout Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.configuration && response.data.configuration.available_products) {
        // Tabby redirects via a web pointer
        const checkoutUrl = response.data.configuration.available_products.installments?.[0]?.web_url;
        if (checkoutUrl) {
          res.json({ url: checkoutUrl, paymentId: response.data.id });
        } else {
          res.status(400).json({ error: "No installments products available from Tabby", details: response.data });
        }
      } else {
        res.status(400).json({ error: "Failed to get checkout URL from Tabby", details: response.data });
      }
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message;
      console.error("❌ Tabby API Error:", JSON.stringify(errorDetail, null, 2));
      res.status(500).json({ 
        error: "Tabby API Error", 
        message: error.response?.data?.message || error.message,
        details: errorDetail 
      });
    }
  });

  app.post("/api/payment/tabby/webhook", async (req, res) => {
    try {
      const { id, status, order } = req.body;
      const orderReferenceId = order?.reference_id;
      console.log(`🔔 Received Tabby Webhook: Order #${orderReferenceId}, Status: ${status}`);

      if (status === 'authorized' || status === 'closed') {
        await WooCommerce.put(`orders/${orderReferenceId}`, {
          status: 'processing',
          set_paid: true,
          customer_note: `تم تأكيد الدفع عبر تابي. رقم عملية تابي: ${id}`
        });
      }
      res.json({ received: true });
    } catch (error: any) {
      console.error("❌ Tabby Webhook Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.get("/api/cache/clear", (req, res) => {
    Object.keys(cache).forEach(key => delete cache[key]);
    console.log("🧹 Global cache cleared by manual request");
    res.json({ success: true, message: "Global cache cleared" });
  });

  // Payment Gateway Routes
  app.get("/api/payment-gateways", async (req, res) => {
    try {
      console.log("📡 Fetching payment gateways from WooCommerce API...");
      const response = await WooCommerce.get("payment_gateways");
      console.log(`✅ Received ${Array.isArray(response.data) ? response.data.length : 0} payment gateways`);
      
      // Log enabled gateways for debugging
      if (Array.isArray(response.data)) {
        const enabled = response.data.filter((g: any) => g.enabled === true || g.enabled === 'yes' || g.enabled === '1');
        console.log("✅ Enabled gateways:", enabled.map((g: any) => `${g.id} (${g.title})`));
      }

      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Payment Gateways):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch payment gateways" });
    }
  });

  app.put("/api/payment-gateways/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`📡 PUT /api/payment-gateways/${id} - Body:`, JSON.stringify(req.body));
      const response = await WooCommerce.put(`payment_gateways/${id}`, req.body);
      console.log(`✅ WooCommerce Response (Update Gateway ${id}):`, JSON.stringify(response.data));
      res.json(response.data);
    } catch (error: any) {
      console.error(`❌ WooCommerce API Error (Update Payment Gateway ${req.params.id}):`, error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to update payment gateway", 
        details: error.response?.data || error.message 
      });
    }
  });

  // Shipping Routes
  app.get("/api/shipping/methods", async (req, res) => {
    try {
      const cacheKey = "shipping-methods-all";
      const cachedData = getCachedData(cacheKey, SHORT_CACHE_TTL);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      // First get zones
      console.log("📡 Fetching shipping zones...");
      const zonesRes = await WooCommerce.get("shipping/zones");
      const zones = Array.isArray(zonesRes.data) ? zonesRes.data : [];
      console.log(`✅ Found ${zones.length} zones`);
      
      let allMethods: any[] = [];
      
      // For each zone, get its methods in parallel
      const methodsPromises = zones.map(async (zone: any) => {
        try {
          console.log(`📡 Fetching methods for zone: ${zone.name} (${zone.id})`);
          const methodsRes = await WooCommerce.get(`shipping/zones/${zone.id}/methods`);
          if (Array.isArray(methodsRes.data)) {
            console.log(`✅ Found ${methodsRes.data.length} methods for zone ${zone.id}`);
            return methodsRes.data.map((m: any) => {
              if (m.method_id === 'free_shipping') {
                console.log(`📦 Free Shipping Method found in Zone ${zone.id}. Settings:`, JSON.stringify(m.settings));
              }
              return {
                ...m,
                zone_id: zone.id,
                zone_name: zone.name
              };
            });
          }
        } catch (e: any) {
          console.error(`❌ Error fetching methods for zone ${zone.id}:`, e.response?.data || e.message);
        }
        return [];
      });

      const methodsResults = await Promise.all(methodsPromises);
      allMethods = methodsResults.flat();

      // Also check "Locations not covered by your other zones" (Zone 0)
      try {
        console.log("📡 Fetching methods for 'Rest of World' (Zone 0)...");
        const restOfWorldRes = await WooCommerce.get("shipping/zones/0/methods");
        if (Array.isArray(restOfWorldRes.data)) {
          console.log(`✅ Found ${restOfWorldRes.data.length} methods for Zone 0`);
          const restOfWorldMethods = restOfWorldRes.data.map((m: any) => {
            if (m.method_id === 'free_shipping') {
              console.log("📦 Free Shipping Method found in Zone 0. Settings:", JSON.stringify(m.settings));
            }
            return {
              ...m,
              zone_id: 0,
              zone_name: "باقي المناطق"
            };
          });
          allMethods = [...allMethods, ...restOfWorldMethods];
        }
      } catch (e: any) {
        console.log("ℹ️ Zone 0 methods not found or empty");
      }

      console.log(`🚀 Total shipping methods found: ${allMethods.length}`);
      setCachedData(cacheKey, allMethods);
      res.json(allMethods);
    } catch (error: any) {
      console.error("WooCommerce API Error (Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  app.get("/api/shipping/zones", async (req, res) => {
    try {
      const cacheKey = "shipping-zones-all";
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await WooCommerce.get("shipping/zones");
      let zones = Array.isArray(response.data) ? response.data : [];
      
      // Add Zone 0 (Rest of the world) if not already present
      if (!zones.find((z: any) => z.id === 0)) {
        zones.push({
          id: 0,
          name: "باقي المناطق",
          order: 0,
          formatted_location: "جميع المناطق غير المشمولة"
        });
      }
      
      setCachedData(cacheKey, zones);
      res.json(zones);
    } catch (error: any) {
      console.error("WooCommerce API Error (Zones):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch shipping zones" });
    }
  });

  const clearShippingCache = () => {
    Object.keys(cache).forEach(key => {
      if (key.startsWith('shipping-')) {
        delete cache[key];
      }
    });
    console.log("Shipping cache cleared due to update/create/delete");
  };

  app.post("/api/shipping/methods/:zoneId", async (req, res) => {
    try {
      const { zoneId } = req.params;
      const response = await WooCommerce.post(`shipping/zones/${zoneId}/methods`, req.body);
      clearShippingCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Create Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create shipping method", details: error.response?.data });
    }
  });

  app.put("/api/shipping/methods/:zoneId/:instanceId", async (req, res) => {
    try {
      const { zoneId, instanceId } = req.params;
      const response = await WooCommerce.put(`shipping/zones/${zoneId}/methods/${instanceId}`, req.body);
      clearShippingCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Update Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to update shipping method", details: error.response?.data });
    }
  });

  app.delete("/api/shipping/methods/:zoneId/:instanceId", async (req, res) => {
    try {
      const { zoneId, instanceId } = req.params;
      const response = await WooCommerce.delete(`shipping/zones/${zoneId}/methods/${instanceId}`, { force: true });
      clearShippingCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Delete Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to delete shipping method", details: error.response?.data });
    }
  });

  // Catch-all for /api/* to prevent returning HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // On Vercel, static files are handled by vercel.json, but we keep this for local production testing
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // Only listen if not in a serverless environment (like Vercel)
  if (process.env.NODE_ENV !== "production" || (!process.env.VERCEL && !process.env.NOW_REGION)) {
    console.log(`🚀 Attempting to start server on port ${PORT}...`);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server successfully running on http://0.0.0.0:${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  return app;
}

// For Vercel, we need to export the app instance. 
// Since startServer is async, we export a handler that awaits it.
const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};

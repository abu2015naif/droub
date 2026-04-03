import express from "express";
import path from "path";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";
import fs from "fs";

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
      timeout: 20000,
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

  const getCachedData = (key: string) => {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
      const response = await WooCommerce.post("products", req.body);
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Create Product):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create product", details: error.response?.data });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.featured !== undefined) {
        updateData.featured = updateData.featured === true || String(updateData.featured) === "true";
      }
      
      console.log(`📡 Updating product ${req.params.id} with:`, updateData);
      const response = await WooCommerce.put(`products/${req.params.id}`, updateData);
      console.log(`✅ Product ${req.params.id} updated successfully. New featured status:`, response.data.featured);
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("❌ WooCommerce API Error (Update Product):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to update product", details: error.response?.data });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const response = await WooCommerce.delete(`products/${req.params.id}`, {
        force: true // Permanently delete
      });
      clearProductCache();
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Delete Product):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to delete product", details: error.response?.data });
    }
  });

  // Order Routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { per_page = 20, page = 1, status } = req.query;
      const response = await WooCommerce.get("orders", {
        per_page,
        page,
        status
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Orders):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const response = await WooCommerce.post("orders", req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Create Order):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create order", details: error.response?.data });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const response = await WooCommerce.put(`orders/${req.params.id}`, req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Update Order):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to update order", details: error.response?.data });
    }
  });

  // Telr Payment Routes
  app.post("/api/payment/telr", async (req, res) => {
    try {
      const { orderId, amount, currency, customer, returnUrl, cancelUrl, payMethod } = req.body;
      
      // Use credentials from user screenshot as defaults if env vars are missing
      const storeId = (process.env.TELR_STORE_ID || "30349").trim();
      const apiKey = (process.env.TELR_API_KEY || "Z7TjQ~XFDJ@d6N5R").trim();
      const testMode = process.env.TELR_TEST_MODE === "1" ? "1" : "0";

      if (!storeId || !apiKey) {
        return res.status(500).json({ error: "Telr configuration missing" });
      }

      // Ensure amount is formatted to 2 decimal places as required by many gateways
      const formattedAmount = parseFloat(amount.toString()).toFixed(2);
      const formattedCurrency = (currency || "SAR").toUpperCase();

      // Manually construct the body to have full control over encoding
      // Telr sometimes has issues with standard URL encoding of special characters in the authkey
      const data: Record<string, string> = {
        ivp_method: "create",
        ivp_store: storeId,
        ivp_authkey: apiKey,
        ivp_cart: orderId.toString(),
        ivp_test: testMode,
        ivp_amount: formattedAmount,
        ivp_currency: formattedCurrency,
        ivp_desc: `Order #${orderId}`,
        return_auth: returnUrl,
        return_can: cancelUrl,
        return_decl: cancelUrl,
        ivp_trantype: "sale",
        ivp_lang: "ar",
        bill_fname: customer.firstName || "Customer",
        bill_sname: customer.lastName || "Name",
        bill_addr1: customer.address || "N/A",
        bill_city: customer.city || "Riyadh",
        bill_country: "SA",
        bill_email: customer.email,
        bill_phone: customer.phone || "0000000000"
      };

      if (payMethod === "applepay") {
        data.ivp_paymethod = "applepay";
      }

      // Construct the form-urlencoded string manually
      const body = Object.entries(data)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      console.log(`📡 Initiating Telr payment for Order #${orderId}, Amount: ${formattedAmount} ${formattedCurrency}`);
      console.log(`   Store ID: ${storeId}, Test Mode: ${testMode}`);
      
      // Try to get the server's public IP to help the user with whitelisting
      try {
        const ipRes = await axios.get('https://api.ipify.org?format=json');
        console.log(`🌍 Server Public IP: ${ipRes.data.ip} (Please ensure this IP is whitelisted in Telr Merchant Admin)`);
      } catch (e) {
        console.log("🌍 Could not determine server public IP");
      }

      const response = await axios.post("https://secure.telr.com/gateway/order.json", body, {
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

  // Payment Gateway Routes
  app.get("/api/payment-gateways", async (req, res) => {
    try {
      const response = await WooCommerce.get("payment_gateways");
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Payment Gateways):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch payment gateways" });
    }
  });

  app.put("/api/payment-gateways/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await WooCommerce.put(`payment_gateways/${id}`, req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Update Payment Gateway):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to update payment gateway", details: error.response?.data });
    }
  });

  // Shipping Routes
  app.get("/api/shipping/methods", async (req, res) => {
    try {
      const cacheKey = "shipping-methods-all";
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.json(cachedData);
      }

      // First get zones
      const zonesRes = await WooCommerce.get("shipping/zones");
      const zones = Array.isArray(zonesRes.data) ? zonesRes.data : [];
      
      let allMethods: any[] = [];
      
      // For each zone, get its methods
      for (const zone of zones) {
        try {
          const methodsRes = await WooCommerce.get(`shipping/zones/${zone.id}/methods`);
          if (Array.isArray(methodsRes.data)) {
            const methods = methodsRes.data.map((m: any) => ({
              ...m,
              zone_id: zone.id,
              zone_name: zone.name
            }));
            allMethods = [...allMethods, ...methods];
          }
        } catch (e) {
          console.error(`Error fetching methods for zone ${zone.id}:`, e);
        }
      }

      // Also check "Locations not covered by your other zones" (Zone 0)
      try {
        const restOfWorldRes = await WooCommerce.get("shipping/zones/0/methods");
        if (Array.isArray(restOfWorldRes.data)) {
          const restOfWorldMethods = restOfWorldRes.data.map((m: any) => ({
            ...m,
            zone_id: 0,
            zone_name: "باقي المناطق"
          }));
          allMethods = [...allMethods, ...restOfWorldMethods];
        }
      } catch (e) {
        // Zone 0 might not have methods or might fail in some WC versions
      }

      setCachedData(cacheKey, allMethods);
      res.json(allMethods);
    } catch (error: any) {
      console.error("WooCommerce API Error (Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  app.get("/api/shipping/zones", async (req, res) => {
    try {
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
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

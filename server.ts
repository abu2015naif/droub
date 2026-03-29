import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function startServer() {
  const WC = (WooCommerceRestApi as any).default || WooCommerceRestApi;
  let siteUrl = (process.env.WC_SITE_URL || "https://droubalsalamah.com").trim();
  if (!siteUrl.startsWith("http")) siteUrl = `https://${siteUrl}`;
  
  console.log("Initializing WooCommerce with URL:", siteUrl);
  
  let WooCommerce: any;
  try {
    WooCommerce = new WC({
      url: siteUrl,
      consumerKey: (process.env.WC_CONSUMER_KEY || "").trim(),
      consumerSecret: (process.env.WC_CONSUMER_SECRET || "").trim(),
      version: "wc/v3",
      queryString: true // Use query string for auth, often more reliable
    });
  } catch (err: any) {
    console.error("Failed to initialize WooCommerce SDK:", err.message);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", async (req, res) => {
    try {
      const { per_page = 20, page = 1, category, search } = req.query;
      const response = await WooCommerce.get("products", {
        per_page,
        page,
        category,
        search,
        status: "publish"
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Products):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const response = await WooCommerce.get("products/categories", {
        per_page: 100,
        hide_empty: true
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Categories):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const response = await WooCommerce.get(`products/${req.params.id}`);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Product Detail):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch product details" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const response = await WooCommerce.post("products", req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Create Product):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create product", details: error.response?.data });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const response = await WooCommerce.put(`products/${req.params.id}`, req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Update Product):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to update product", details: error.response?.data });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const response = await WooCommerce.delete(`products/${req.params.id}`, {
        force: true // Permanently delete
      });
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
      const { orderId, amount, currency, customer, returnUrl, cancelUrl } = req.body;
      
      const storeId = process.env.TELR_STORE_ID;
      const apiKey = process.env.TELR_API_KEY;
      const testMode = process.env.TELR_TEST_MODE === "1" ? 1 : 0;

      if (!storeId || !apiKey) {
        return res.status(500).json({ error: "Telr configuration missing" });
      }

      const params = new URLSearchParams();
      params.append("ivp_method", "create");
      params.append("ivp_store", storeId.trim());
      params.append("ivp_authkey", apiKey.trim());
      params.append("ivp_cart", orderId.toString());
      params.append("ivp_test", testMode.toString());
      params.append("ivp_amount", amount.toString());
      params.append("ivp_currency", currency || "SAR");
      params.append("ivp_desc", `Order #${orderId}`);
      params.append("return_auth", returnUrl);
      params.append("return_can", cancelUrl);
      params.append("return_decl", cancelUrl);
      params.append("ivp_trantype", "sale");
      params.append("bill_fname", customer.firstName || "Customer");
      params.append("bill_sname", customer.lastName || "Name");
      params.append("bill_addr1", customer.address || "N/A");
      params.append("bill_city", customer.city || "Riyadh");
      params.append("bill_country", "SA");
      params.append("bill_email", customer.email);
      params.append("bill_phone", customer.phone || "0000000000");

      console.log("Initiating Telr payment with Form Data (ivp_ keys)...");

      const response = await axios.post("https://secure.telr.com/gateway/order.json", params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.order && response.data.order.url) {
        res.json({ url: response.data.order.url, ref: response.data.order.ref });
      } else {
        console.error("Telr API Error Response:", response.data);
        const errorMsg = response.data.error?.note || response.data.error?.message || "Request authentication failed";
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
      const storeId = process.env.TELR_STORE_ID;
      const apiKey = process.env.TELR_API_KEY;

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

  // Shipping Routes
  app.get("/api/shipping/methods", async (req, res) => {
    try {
      // First get zones
      const zonesRes = await WooCommerce.get("shipping/zones");
      const zones = zonesRes.data;
      
      let allMethods: any[] = [];
      
      // For each zone, get its methods
      for (const zone of zones) {
        const methodsRes = await WooCommerce.get(`shipping/zones/${zone.id}/methods`);
        const methods = methodsRes.data.map((m: any) => ({
          ...m,
          zone_id: zone.id,
          zone_name: zone.name
        }));
        allMethods = [...allMethods, ...methods];
      }

      // Also check "Locations not covered by your other zones" (Zone 0)
      try {
        const restOfWorldRes = await WooCommerce.get("shipping/zones/0/methods");
        const restOfWorldMethods = restOfWorldRes.data.map((m: any) => ({
          ...m,
          zone_id: 0,
          zone_name: "باقي المناطق"
        }));
        allMethods = [...allMethods, ...restOfWorldMethods];
      } catch (e) {
        // Zone 0 might not have methods or might fail in some WC versions
      }

      res.json(allMethods);
    } catch (error: any) {
      console.error("WooCommerce API Error (Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  app.get("/api/shipping/zones", async (req, res) => {
    try {
      const response = await WooCommerce.get("shipping/zones");
      const zones = response.data;
      
      // Add Zone 0 (Rest of the world)
      zones.push({
        id: 0,
        name: "باقي المناطق",
        order: 0,
        formatted_location: "جميع المناطق غير المشمولة"
      });
      
      res.json(zones);
    } catch (error: any) {
      console.error("WooCommerce API Error (Zones):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch shipping zones" });
    }
  });

  app.post("/api/shipping/methods/:zoneId", async (req, res) => {
    try {
      const { zoneId } = req.params;
      const response = await WooCommerce.post(`shipping/zones/${zoneId}/methods`, req.body);
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
      res.json(response.data);
    } catch (error: any) {
      console.error("WooCommerce API Error (Delete Shipping):", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to delete shipping method", details: error.response?.data });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

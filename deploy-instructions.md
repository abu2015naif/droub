# تعليمات استبدال موقعك القديم بالتصميم الجديد (Headless WooCommerce)

هذا الدليل سيشرح لك كيف تجعل التصميم الجديد هو الواجهة الرئيسية لموقعك `droubalsalamah.com` مع بقاء ووردبريس لإدارة المنتجات فقط.

## 1. تجهيز ووردبريس (الخلفية)
قبل رفع التصميم الجديد، يجب "إخلاء" الصفحة الرئيسية:
1. ادخل إلى **File Manager** في cPanel.
2. اذهب إلى مجلد `public_html`.
3. أنشئ مجلداً جديداً باسم `wp` (أو أي اسم تفضله).
4. انقل **جميع** ملفات ومجلدات ووردبريس الحالية إلى داخل هذا المجلد الجديد (`wp`).
5. **هام:** ادخل إلى قاعدة البيانات (phpMyAdmin) وحدث جدول `wp_options`:
   - غير `siteurl` إلى `https://droubalsalamah.com/wp`
   - غير `home` إلى `https://droubalsalamah.com/wp`
   *(الآن ستصبح لوحة تحكم ووردبريس متاحة على `droubalsalamah.com/wp/wp-admin`)*.

## 2. تجهيز المشروع محلياً (Build)
على جهازك الشخصي:
1. افتح التيرمينال ونفذ `npm install`.
2. نفذ `npm run build`.
   *سينتج مجلد `dist` الجاهز للنشر.*

## 3. إعداد تطبيق Node.js في cPanel (الواجهة الجديدة)
1. في cPanel، ابحث عن **"Setup Node.js App"**.
2. اضغط على **"Create Application"**.
3. الإعدادات:
   - **Node.js version:** أحدث نسخة (20.x).
   - **Application mode:** `Production`.
   - **Application root:** مجلد المشروع (مثلاً `new_site`).
   - **Application URL:** اختر الدومين الرئيسي `/` (اتركه فارغاً بعد الدومين).
   - **Application startup file:** `dist/server.js`.
4. اضغط على **"Create"**.

## 4. رفع الملفات وتثبيت الحزم
1. ارفع ملفات المشروع إلى مجلد `new_site` (باستثناء `node_modules`).
2. في صفحة Node.js App، اضغط **"Run npm install"**.

## 5. إعداد متغيرات البيئة (Environment Variables)
أضف المتغيرات التالية (لاحظ تغيير رابط الموقع):
- `WC_SITE_URL`: `https://droubalsalamah.com/wp` (الرابط الجديد لووردبريس)
- `WC_CONSUMER_KEY`: (مفتاح WooCommerce الخاص بك)
- `WC_CONSUMER_SECRET`: (السر الخاص بـ WooCommerce)
- `TELR_STORE_ID`: (معرف متجر Telr)
- `TELR_API_KEY`: (مفتاح API الخاص بـ Telr)
- `NODE_ENV`: `production`

## 7. أين تجد مفاتيح الربط (API Keys)؟

### أ- مفاتيح WooCommerce:
1. من ووردبريس: **WooCommerce** > **Settings** > **Advanced** > **REST API**.
2. اضغط **Add Key**.
3. الصلاحيات: **Read/Write**.
4. ستحصل على `Consumer Key` و `Consumer Secret`.

### ب- مفاتيح بوابة الدفع Telr:
1. سجل دخولك لموقع **Telr Merchant Dashboard**.
2. **Store ID**: موجود في إعدادات الحساب.
3. **API Key**: موجود في قسم **Integration**.

## 8. إعداد Firebase
يجب إضافة الدومين الرئيسي `droubalsalamah.com` في قائمة **Authorized domains** في Firebase Console.

---

### النتيجة النهائية:
*   **الزوار:** عند دخولهم لـ `droubalsalamah.com` سيشاهدون التصميم الجديد فوراً.
*   **أنت:** ستدير المنتجات والطلبات من خلال `droubalsalamah.com/wp/wp-admin`.
*   **NODE_ENV**: تأكد من ضبطها على `production` في cPanel لضمان أفضل أداء للموقع.
* **WooCommerce API:** تأكد من تفعيل "REST API" في إعدادات ووردبريس (WooCommerce > Settings > Advanced > REST API) وإنشاء مفاتيح بصلاحيات "Read/Write".
* **CORS:** الخادم (Express) مهيأ بالفعل للتعامل مع الطلبات، ولكن تأكد من أن شهادة SSL (HTTPS) مفعلة على موقعك.
* **WordPress:** سيبقى موقعك الحالي يعمل كما هو، وسيكون المتجر الجديد متاحاً على الرابط الذي اخترته (مثلاً `droubalsalamah.com/shop`).

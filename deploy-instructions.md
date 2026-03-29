# تعليمات النشر على استضافة Namecheap (cPanel)

لنشر متجرك الإلكتروني على استضافة Namecheap مع الحفاظ على ووردبريس وWooCommerce، اتبع الخطوات التالية:

## 1. تجهيز المشروع (Build)
قم بتشغيل الأمر التالي في جهازك المحلي (أو سيقوم النظام هنا بتجهيزه لك):
```bash
npm run build
```
هذا سينتج مجلد `dist` الذي يحتوي على ملفات الموقع والملف البرمجي للخادم (`server.js`).

**ملاحظة هامة:** إذا كنت تنوي نشر المتجر في مجلد فرعي (مثلاً `droubalsalamah.com/shop`) بدلاً من الصفحة الرئيسية، يجب عليك تعديل ملف `vite.config.ts` وإضافة خاصية `base: '/shop/'` قبل عملية البناء.

## 2. إعداد تطبيق Node.js في cPanel
1. سجل الدخول إلى **cPanel** في Namecheap.
2. ابحث عن **"Setup Node.js App"**.
3. اضغط على **"Create Application"**.
4. حدد الإعدادات التالية:
   - **Node.js version:** اختر أحدث نسخة مستقرة (مثلاً 20.x).
   - **Application mode:** اختر `Production`.
   - **Application root:** اكتب مسار المجلد الذي سترفع فيه الملفات (مثلاً `shop_app`).
   - **Application URL:** اختر الدومين أو المجلد الفرعي (مثلاً `shop`).
   - **Application startup file:** اكتب `dist/server.js`.
5. اضغط على **"Create"**.

## 3. رفع الملفات
1. اذهب إلى **"File Manager"** في cPanel.
2. ادخل إلى المجلد الذي حددته في الخطوة السابقة (`shop_app`).
3. ارفع محتويات مشروعك بالكامل (باستثناء مجلد `node_modules`).
4. تأكد من وجود ملف `package.json` و `dist` و `.env`.

## 4. تثبيت الحزم (Dependencies)
1. عد إلى صفحة **"Setup Node.js App"**.
2. اضغط على زر **"Run npm install"** (سيقوم بقراءة ملف `package.json` وتثبيت المكتبات اللازمة).

## 5. إعداد متغيرات البيئة (Environment Variables)
في نفس صفحة Node.js App، أضف المتغيرات التالية في قسم **"Environment variables"**:
- `WC_SITE_URL`: `https://droubalsalamah.com`
- `WC_CONSUMER_KEY`: (مفتاح WooCommerce الخاص بك)
- `WC_CONSUMER_SECRET`: (السر الخاص بـ WooCommerce)
- `TELR_STORE_ID`: (معرف متجر Telr)
- `TELR_API_KEY`: (مفتاح API الخاص بـ Telr)
- `NODE_ENV`: `production`

## 6. إعداد ملف .htaccess (اختياري)
في بعض الأحيان، قد تحتاج لإضافة ملف `.htaccess` في المجلد الرئيسي للموقع لتوجيه الطلبات إلى تطبيق Node.js:
```apache
RewriteEngine On
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```
*(ملاحظة: cPanel غالباً ما يقوم بهذا تلقائياً عند إنشاء تطبيق Node.js).*

## 7. إعادة تشغيل التطبيق
اضغط على **"Restart"** في صفحة Node.js App.

## 8. إعداد Firebase (هام جداً)
بما أنك تستخدم Firebase لتسجيل الدخول، يجب عليك إضافة الدومين الجديد إلى قائمة النطاقات المصرح لها:
1. اذهب إلى **Firebase Console**.
2. اختر مشروعك، ثم اذهب إلى **Authentication** > **Settings** > **Authorized domains**.
3. أضف الدومين الخاص بك: `droubalsalamah.com`.
4. إذا كنت تستخدم مجلداً فرعياً، الدومين الرئيسي يكفي.

---

### ملاحظات هامة:
* **WooCommerce API:** تأكد من تفعيل "REST API" في إعدادات ووردبريس (WooCommerce > Settings > Advanced > REST API) وإنشاء مفاتيح بصلاحيات "Read/Write".
* **CORS:** الخادم (Express) مهيأ بالفعل للتعامل مع الطلبات، ولكن تأكد من أن شهادة SSL (HTTPS) مفعلة على موقعك.
* **WordPress:** سيبقى موقعك الحالي يعمل كما هو، وسيكون المتجر الجديد متاحاً على الرابط الذي اخترته (مثلاً `droubalsalamah.com/shop`).

# دليل النشر على Vercel (مع بقاء WooCommerce على Namecheap)

لجعل التصميم الجديد هو الواجهة الرئيسية لموقعك `droubalsalamah.com` مع بقاء ووردبريس لإدارة المنتجات، اتبع هذه الخطوات:

## 1. إعداد ووردبريس (على Namecheap)
يجب أن يبقى ووردبريس متاحاً عبر الإنترنت ليعمل كـ "محرك خلفي" (Backend):
1. في cPanel، أنشئ دومين فرعي (Subdomain) مثل `api.droubalsalamah.com`.
2. انقل ملفات ووردبريس الحالية إلى هذا الدومين الفرعي.
3. تأكد من أن لوحة التحكم تعمل على `api.droubalsalamah.com/wp-admin`.

## 2. النشر على Vercel
1. ارفع الكود الخاص بك إلى **GitHub** (أو قم برفع المجلد مباشرة لـ Vercel).
2. في لوحة تحكم Vercel، اضغط على **"Add New Project"**.
3. اختر المستودع الخاص بك.
4. في قسم **Environment Variables**، أضف المتغيرات التالية:
   - `WC_SITE_URL`: `https://api.droubalsalamah.com` (رابط ووردبريس الجديد)
   - `WC_CONSUMER_KEY`: (مفتاح WooCommerce الخاص بك)
   - `WC_CONSUMER_SECRET`: (السر الخاص بـ WooCommerce)
   - `TELR_STORE_ID`: (معرف متجر Telr)
   - `TELR_API_KEY`: (مفتاح API الخاص بـ Telr)
   - `NODE_ENV`: `production`
5. اضغط على **Deploy**.

## 3. ربط الدومين الرئيسي
1. في Vercel، اذهب إلى إعدادات المشروع (Settings) ثم **Domains**.
2. أضف الدومين الخاص بك: `droubalsalamah.com`.
3. سيطلب منك Vercel إضافة سجلات (A Record) أو (CNAME) في لوحة تحكم Namecheap (DNS Settings).
4. بمجرد اكتمال الربط، سيصبح التصميم الجديد هو الواجهة الرئيسية لموقعك.

## 4. إعداد Firebase
يجب إضافة الدومين الرئيسي `droubalsalamah.com` في قائمة **Authorized domains** في Firebase Console.

---

### النتيجة النهائية:
*   **الزوار:** عند دخولهم لـ `droubalsalamah.com` سيشاهدون التصميم الجديد (المستضاف على Vercel).
*   **أنت:** ستدير المنتجات والطلبات من خلال `api.droubalsalamah.com/wp-admin` (المستضاف على Namecheap).

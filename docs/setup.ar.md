# الإعداد الكامل

أنشئ PostgreSQL فارغة ثم انسخ api/.env.example إلى api/.env واضبط DATABASE_URL وJWT_SECRET جديداً بطول 32 حرفاً على الأقل وكلمتي ADMIN_PASSWORD وDEMO_PASSWORD بطول 12 على الأقل. اجعل SEED_DEMO_DATA=1 للعرض المؤقت فقط. تضيف التعبئة سائقاً وتجاراً اصطناعيين، ويضيف bootstrap-customer عميلين. اضبط بيئة الإدارة وAPI على 2007 وبيئات العميل والسائق حسب المحاكي أو الشبكة. أعد إعداد الخرائط وFirebase والتوقيع بصورة مستقلة.

## الأوامر

```sh
cd api
npm ci
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
node tools/bootstrap-customer.js
npm run build
npm run start:prod
# Separate terminal, same disposable environment:
node tools/check-demo.js
# Admin:
cd ../admin
npm ci
npm run dev
# Each mobile component:
cd ../customer
npm ci
npx expo start
```

## جرد الإعداد

| المتغير | موضع الاستخدام | قاعدة الإعداد |
|---|---|---|
| `ADMIN_EMAIL` | `api/prisma/seed.js` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `ADMIN_PASSWORD` | `api/prisma/seed.js` | قدم القيمة بصورة خاصة عند تفعيل التكامل، دون سر افتراضي. |
| `EXPO_PUBLIC_API_URL` | `customer/api/client.ts` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `customer/lib/mapbox.ts` | قدم القيمة بصورة خاصة عند تفعيل التكامل، دون سر افتراضي. |
| `EXPO_PUBLIC_VISUAL_FIXTURES` | `customer/lib/visual-fixtures.ts` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `EXPO_UNSTABLE_CORE_AUTOLINKING` | `customer/android/settings.gradle` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `GOOGLE_APPLICATION_CREDENTIALS` | `api/src/notifications/notifications.service.ts` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `JWT_SECRET` | `api/src/auth/jwt-secret.ts` | قدم القيمة بصورة خاصة عند تفعيل التكامل، دون سر افتراضي. |
| `PORT` | `api/src/main.ts` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `customer/android/build.gradle` | قدم القيمة بصورة خاصة عند تفعيل التكامل، دون سر افتراضي. |
| `SEED_DEMO_DATA` | `api/prisma/seed.js` | استخدم المثال المحلي أو افتراضي الشيفرة واضبطه للبيئة المؤقتة. |

ليست كل متغيرات الجرد إلزامية. تحدد الفقرة الأولى قيم التشغيل الأساسية، وتلزم قيم المزود للتكامل الحي المفعل فقط. تتجاوز DEMO_API_URL هدف الفحص المحلي عند دعمه. لا توجه أوامر التعبئة والاستعادة والفحص لقاعدة إنتاج. لا تُحمّل أمثلة البيئة نفسها تلقائياً؛ جهز بيئة العملية أو dotenv حيث يستخدمه المكون.

## المكونات

| المكون | المسؤولية |
|---|---|
| `customer/` | تطبيق العميل Expo وشيفرة أندرويد |
| `driver/` | تطبيق السائق والتاجر Expo |
| `admin/` | لوحة العمليات React وVite |
| `api/src/` | وحدات Nest للطلبات والنقد والسجلات والحسابات والإشعارات |
| `api/prisma/` | المخطط والترحيلات والتعبئة |

# الواجهات ومسارات التنفيذ

يختار العميل العنوان والمنتجات ← يحسب الخادم الطلب ← يجهز التاجر ← يقبل السائق العرض ← تُحدَّث متابعة التوصيل ← تسوي الإدارة النقد وقيود الدفتر.

تحتاج المسارات المحلية للموجه إلى بادئة الخادم. تستخدم مسارات PHP الملفات الفعلية ما لم توجد إعادة كتابة. المتحكمات والوسطاء في الشيفرة مرجع الحقول والصلاحيات. فحوص tools/check-demo تمثل طلبات حقيقية ببيانات اصطناعية وليست مزوداً وهمياً.

## مراجع التنفيذ

- [api/src/orders/orders.service.ts](../api/src/orders/orders.service.ts)
- [api/src/orders/delivery-offer.service.ts](../api/src/orders/delivery-offer.service.ts)
- [api/src/orders/cod-remittance.service.ts](../api/src/orders/cod-remittance.service.ts)
- [api/src/merchants/merchant-ledger.service.ts](../api/src/merchants/merchant-ledger.service.ts)
- [api/src/settlements/settlement-receipt.service.ts](../api/src/settlements/settlement-receipt.service.ts)
- [api/prisma/schema.prisma](../api/prisma/schema.prisma)

## حدود التكامل

لم تُفحص أجهزة وبناء أندرويد والخرائط وFirebase وإشعارات عدة أجهزة والتحديثات المالية المتزامنة. نجح التكرار التسلسلي فقط. أوقف API قبل توليد Prisma أو الاستعادة على Windows لتجنب قفل DLL.


## جرد المسارات



## مثال الاستخدام

صادق العميل المعبأ ثم استخدم رمز Bearer للسلة والطلبات. يوثق فحص العرض طلبات التاجر والسائق والتحويل النقدي الفعلية. النقد هو طريقة الدفع المعروضة؛ وجود قيم أخرى في enum لا يثبت مزود دفع.

```sh
curl -X POST http://localhost:2007/auth/login -H 'Content-Type: application/json' -d '{"email":"customer@example.test","password":"YOUR_DEMO_PASSWORD"}'
curl http://localhost:2007/orders -H 'Authorization: Bearer YOUR_DEMO_TOKEN'
curl http://localhost:2007/categories
```

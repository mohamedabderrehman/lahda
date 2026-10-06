# API and execution paths

This index is extracted from the current source. Router-local paths require their mount prefix from the server entry point. PHP endpoint paths map directly to files unless Apache rewrites them. Controllers and auth middleware are authoritative for request bodies and permissions.

See the source entry points below; this project does not declare Express/Flask router paths.

## Source entry points

- [api/src/orders/orders.service.ts](../api/src/orders/orders.service.ts)
- [api/src/orders/delivery-offer.service.ts](../api/src/orders/delivery-offer.service.ts)
- [api/src/orders/cod-remittance.service.ts](../api/src/orders/cod-remittance.service.ts)
- [api/src/merchants/merchant-ledger.service.ts](../api/src/merchants/merchant-ledger.service.ts)
- [api/src/settlements/settlement-receipt.service.ts](../api/src/settlements/settlement-receipt.service.ts)
- [api/prisma/schema.prisma](../api/prisma/schema.prisma)

## الاستخدام

المسارات المذكورة محلية للموجه وتحتاج بادئة الربط في الخادم. ملفات PHP هي مرجع المسارات ما لم تُعَد كتابتها. استخدم بيانات اصطناعية وفحوص الصلاحيات الموجودة في الشيفرة.


## Representative usage

Authenticate a seeded customer, then use the bearer token for the cart and orders. The synthetic acceptance script documents exact merchant/driver/remittance requests. Cash is the demonstrated payment method; enum values do not establish an online payment provider.

```sh
curl -X POST http://localhost:2007/auth/login -H 'Content-Type: application/json' -d '{"email":"customer@example.test","password":"YOUR_DEMO_PASSWORD"}'
curl http://localhost:2007/orders -H 'Authorization: Bearer YOUR_DEMO_TOKEN'
curl http://localhost:2007/categories
```

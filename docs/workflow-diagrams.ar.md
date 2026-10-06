# الأدوار وحالة الطلب وحركة النقد

## الأدوار

```mermaid
flowchart LR
Customer[Customer: own cart and orders] --> API[NestJS role and ownership checks]
Merchant[Merchant: owned products and preparation] --> API
Driver[Driver: offers and assigned delivery] --> API
Admin[Admin: operations and remittance confirmation] --> API
API --> DB[(PostgreSQL / Prisma)]
```

## حالات الطلب

```mermaid
stateDiagram-v2
[*] --> pending
pending --> accepted_by_merchant
accepted_by_merchant --> preparing
preparing --> ready_for_pickup
ready_for_pickup --> picked_up
picked_up --> on_the_way
on_the_way --> delivered
delivered --> [*]
cancelled --> [*]
```

## النقد

```mermaid
flowchart LR
Customer[Customer pays cash] --> Driver[Driver collects order total]
Driver --> Earnings[Driver earning record]
Delivered[Delivered order] --> Ledger[Merchant ledger entry]
Driver --> Remittance[Remittance: max zero, total minus delivery fee]
Remittance --> Admin[Admin confirms once]
Admin --> Receipt[Settlement receipt and COD status]
Ledger --> Merchant[Merchant balance / settlement workflow]
```

يلخص مخطط الحالة ترتيب التسليم المعتاد؛ تحدد خدمات الطلب الصلاحيات والإلغاء ولا تثبت الأسهم قبول كل انتقال لكل دور. حالات cash/card/wallet في التعداد لا تثبت بوابة بطاقة. يحسب التحويل max(0, total ناقص deliveryFee) ليخفض خصم العميل النقد المحول، مع عرض subtotal وappFee قبل الخصم بصورة مستقلة. يحول الطلب التجريبي 2,140 دج من إجمالي 3,140 دج وتوصيل 1,000 دج. تتحقق فحوص النسخة من تكرار التسليم والتحويل تسلسلياً، دون ادعاء تغطية كل تنافس متزامن.

[Source: COD remittance service](../api/src/orders/cod-remittance.service.ts)

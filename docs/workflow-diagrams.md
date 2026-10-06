# Roles, order states and cash movement

## Role boundaries

```mermaid
flowchart LR
Customer[Customer: own cart and orders] --> API[NestJS role and ownership checks]
Merchant[Merchant: owned products and preparation] --> API
Driver[Driver: offers and assigned delivery] --> API
Admin[Admin: operations and remittance confirmation] --> API
API --> DB[(PostgreSQL / Prisma)]
```

## Order status vocabulary

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

## Cash accounting

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

The state diagram summarizes normal delivery order; order services define role permissions and cancellation. Arrows do not imply every role can execute every transition. The cash/card/wallet enum does not establish a card gateway. The remittance uses max(0, total minus deliveryFee), so customer discounts reduce the cash remitted. Gross subtotal and appFee remain separate reporting fields. The synthetic discounted order remits 2,140 DZD from a 3,140 DZD total and 1,000 DZD delivery fee. Release checks cover sequential delivery/remittance repetition, not every concurrent race.

[Source: COD remittance service](../api/src/orders/cod-remittance.service.ts)

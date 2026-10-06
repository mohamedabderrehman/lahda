# Food and grocery delivery app

## From the problem to the implementation

Order restaurant meals and daily groceries through a mobile app connected to merchant preparation, driver delivery and administration.

Customer chooses an address and products → API calculates the order → merchant prepares → driver accepts an offer → delivery updates tracking → admin reconciles cash and ledger entries.

## Decisions and tradeoffs

A single repository retains customer, driver/merchant, admin and API boundaries so workflow changes can be reviewed together.

Prisma migrations express schema evolution; money-related services use transactions and existing-entry checks. Sequential repeated delivery checks do not prove safety under every concurrent update.

Role guards restrict endpoints, while ownership checks in services restrict records. Both are needed for multi-role data.

Cash-on-delivery workflows are implemented. Payment enum labels do not establish a live card gateway.

Optional Firebase setup lets the backend report disabled push integration without publishing a service-account file.

## What the publication preparation established

API and admin production builds passed. Fresh PostgreSQL initialization applied all 16 Prisma migrations. The synthetic acceptance script passed customer/merchant/driver/admin authentication, rejected admin self-registration and foreign-order access, verified a 10% discount, completed delivery, checked one driver earning and merchant entry, repeated delivery without additional entries, rejected terminal-state regression, and confirmed a remittance once. Fresh-database acceptance also verified discounted COD remittance: a 3,140 DZD customer total minus 1,000 DZD delivery equals 2,140 DZD remitted to administration. Repeating confirmation was rejected. The previous gross-subtotal formula incorrectly charged the driver for the customer discount and was corrected.

## Deployment experience and evidence limits

Previously deployed and tested. Published on Google Play; the supplied application listing was verified accessible during this portfolio update.

Android builds/device walkthroughs, fresh maps/Firebase integration, concurrent financial updates and multi-device notification delivery remain unverified. Repeated sequential updates passed; this is not proof of every concurrency scenario. Stop the API before Prisma generation/reset on Windows to avoid a locked query-engine DLL.

## Next steps

Complete the uncovered checks above, record the results, and update the demonstration. Retain the existing architecture and add reproducible synthetic cases before claiming performance improvements or another provider integration.

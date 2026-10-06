# Current release verification

Recorded on 2026-10-06 using disposable local data. Historical deployment is a separate owner-provided fact.

## Passed locally

API and admin production builds passed. Fresh PostgreSQL initialization applied all 16 Prisma migrations. The synthetic acceptance script passed customer/merchant/driver/admin authentication, rejected admin self-registration and foreign-order access, verified a 10% discount, completed delivery, checked one driver earning and merchant entry, repeated delivery without additional entries, rejected terminal-state regression, and confirmed a remittance once.

## Checks and commands

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

## CI status

The configured GitHub Actions workflows are registered, but the initial runs ended with startup_failure before any jobs or check annotations were created. Local results above are independent of CI. No passing CI badge is shown; the service supplied no further diagnostic message through the available API.

## Remaining platform and coverage limits

Android builds/device walkthroughs, fresh maps/Firebase integration, concurrent financial updates and multi-device notification delivery remain unverified. Repeated sequential updates passed; this is not proof of every concurrency scenario. Stop the API before Prisma generation/reset on Windows to avoid a locked query-engine DLL.

PHP checks used PHP 8.4.26; Node builds used Node 24.19; Python checks used Python 3.12.10 where applicable. This record does not claim production hardening, paid provider verification or tests on every platform.

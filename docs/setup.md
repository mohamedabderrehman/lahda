# Clean setup

Create an empty PostgreSQL database first. Copy api/.env.example to api/.env, set DATABASE_URL, a new JWT_SECRET of at least 32 characters, ADMIN_PASSWORD and DEMO_PASSWORD of at least 12 characters, and keep SEED_DEMO_DATA=1 only for your disposable demo. The seed provides synthetic driver/merchant accounts; bootstrap-customer adds customer@example.test and other@example.test. Configure admin/.env from its example and API URL port 2007. Configure customer and driver API URLs for emulator/LAN access; maps, Android Firebase files and signing material must be supplied separately.

## Commands

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

## Complete configuration inventory

Node 20 or a compatible supported runtime, npm and PostgreSQL are required. In `api/`, copy `.env.example` to `.env`, create the disposable database, install with `npm ci`, run `npm run prisma:generate`, `npm run prisma:migrate:deploy`, then `npm run prisma:seed` and `npm run start:dev`. Set `SEED_DEMO_DATA=1` only on a disposable database. Install and run the admin with `npm ci && npm run dev` from `admin/`. Install each Expo app in its own directory and run `npx expo start`. Configure a reachable API address for devices; device localhost is not the computer.

## Environment variables read by source

| Variable | Source consumer | Configuration rule |
|---|---|---|
| `ADMIN_EMAIL` | `api/prisma/seed.js` | Use the local example/source default; adapt to your disposable environment. |
| `ADMIN_PASSWORD` | `api/prisma/seed.js` | Supply privately when enabling its integration; no secret default. |
| `EXPO_PUBLIC_API_URL` | `customer/api/client.ts` | Use the local example/source default; adapt to your disposable environment. |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `customer/lib/mapbox.ts` | Supply privately when enabling its integration; no secret default. |
| `EXPO_PUBLIC_VISUAL_FIXTURES` | `customer/lib/visual-fixtures.ts` | Use the local example/source default; adapt to your disposable environment. |
| `EXPO_UNSTABLE_CORE_AUTOLINKING` | `customer/android/settings.gradle` | Use the local example/source default; adapt to your disposable environment. |
| `GOOGLE_APPLICATION_CREDENTIALS` | `api/src/notifications/notifications.service.ts` | Use the local example/source default; adapt to your disposable environment. |
| `JWT_SECRET` | `api/src/auth/jwt-secret.ts` | Supply privately when enabling its integration; no secret default. |
| `PORT` | `api/src/main.ts` | Use the local example/source default; adapt to your disposable environment. |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `customer/android/build.gradle` | Supply privately when enabling its integration; no secret default. |
| `SEED_DEMO_DATA` | `api/prisma/seed.js` | Use the local example/source default; adapt to your disposable environment. |

Environment examples do not load themselves. Node dotenv modules read local `.env` where configured; PHP uses its process/hosting environment. Keep provider integrations disconnected for demos. Generate a new secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` or equivalent, then store it privately.

## Declared component commands

### `admin/package.json`

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

### `api/package.json`

```json
{
  "build": "nest build",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:studio": "prisma studio",
  "prisma:seed": "node prisma/seed.js"
}
```

### `customer/package.json`

```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web",
  "build:android:aab": "cd android && gradlew.bat bundleRelease",
  "build:android:aab:eas": "eas build --platform android --profile production"
}
```

### `driver/package.json`

```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "postinstall": "patch-package",
  "build:android:apk": "cd android && gradlew.bat assembleRelease"
}
```

## Source boundaries

| Component | Responsibility |
|---|---|
| `customer/` | Customer Expo application and Android source |
| `driver/` | Driver and merchant Expo application |
| `admin/` | React/Vite operations dashboard |
| `api/src/` | Nest modules for orders, COD, ledgers, accounts and notifications |
| `api/prisma/` | Schema, migrations and seed |


Variables in the inventory are not all mandatory: the preceding prerequisites identify the required core values. Provider variables are required only for their enabled live integration. Tests may use DEMO_API_URL to override the local target. Never point bootstrap/reset/check scripts at a production database.

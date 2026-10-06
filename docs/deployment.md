# Deployment and troubleshooting

## Historical status

Previously deployed and tested. Published on Google Play; the supplied application listing was verified accessible during this portfolio update.

نُشر واختُبر سابقاً، ونُشر على Google Play. تم التحقق من الوصول إلى صفحة التطبيق المرفقة أثناء تحديث المعرض.

## Local release environment

Use fresh configuration, a disposable database/corpus and independently installed dependencies. This release never needs retired production services. Keep credentials, uploaded files, sessions, caches and signing material outside the public source. Credential removal does not revoke a provider key.

## Troubleshooting

### JWT_SECRET error

Generate at least 32 random characters; configure the API environment before startup.

### Prisma database error

Check PostgreSQL reachability and DATABASE_URL; create the database before applying migrations.

### Device cannot reach API

Use a LAN address or Android emulator host alias rather than device localhost.

### Push disabled

Supply a fresh Firebase service-account path only when testing notifications.

## Current limits

Maps, push notifications and Android services need independently configured integrations. Historical signing material and production records are excluded. Current compilation is not a complete device or financial concurrency audit.

تحتاج الخرائط والإشعارات وأندرويد إلى إعدادات مستقلة. استُبعدت مفاتيح التوقيع والسجلات الإنتاجية. نجاح البناء لا يثبت فحصاً شاملاً للأجهزة أو التزامن المالي.

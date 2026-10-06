const appJson = require('./app.json');
const path = require('path');
const fs = require('fs');

// Use app icon from project assets (same as "pics and assests/app-logo.png")
// FCM: add google-services.json in this folder for Android push notifications, then run: npx expo prebuild --clean
const hasGoogleServices = fs.existsSync(path.join(__dirname, 'google-services.json'));

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    ...(hasGoogleServices && { googleServicesFile: './google-services.json' }),
  },
  extra: {
    ...(appJson.expo.extra || {}),
  },
});

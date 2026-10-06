# Build Lahda Customer app as Android App Bundle (.aab) for Play Store
#
# --- AAB output path (once built) ---
#   Local Gradle/Android Studio:
#     customer\android\app\build\outputs\bundle\release\app-release.aab
#   Full path: c:\Users\user\Documents\everything\lahda\customer\android\app\build\outputs\bundle\release\app-release.aab
#
# --- Option 1: Android Studio (recommended if local build was failing) ---
#   1. Open Android Studio -> Open -> customer\android
#   2. Build -> Generate Signed Bundle / APK -> Android App Bundle
#   3. Use existing keystore: android\app\customer-release.keystore (see android\keystore.properties)
#   4. Build release; the .aab is written to the path above.
#
# --- Option 2: EAS Build (cloud) ---
#   Prerequisites: Git installed, run "npx eas-cli login" once.
#   Then run this script, or: npx eas-cli build --platform android --profile production
#   When the build finishes, download the .aab from the link shown (or from Expo dashboard).
#
# --- Option 3: Local Gradle (may fail on expo-font with current RN/Expo) ---
#   cd customer\android
#   .\gradlew.bat bundleRelease
#   Output: android\app\build\outputs\bundle\release\app-release.aab

$ErrorActionPreference = "Stop"
$customerRoot = $PSScriptRoot
$androidDir = Join-Path $customerRoot "android"
$bundleDir = Join-Path $androidDir "app\build\outputs\bundle\release"
$aabPath = Join-Path $bundleDir "app-release.aab"

# Remove old .aab if present
if (Test-Path $aabPath) {
  Write-Host "Removing old .aab: $aabPath"
  Remove-Item $aabPath -Force
}

Write-Host "Starting EAS Build for Android (production .aab)..."
Write-Host "Ensure Git is installed and you are logged in: npx eas-cli login"
Write-Host ""
Set-Location $customerRoot
npx eas-cli build --platform android --profile production

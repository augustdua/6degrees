# 6Degree Mobile App Setup Guide

This guide will help you set up, build, and deploy the 6Degree mobile app for Android and iOS.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Setup (Required for Push Notifications)](#firebase-setup)
3. [Database Migrations](#database-migrations)
4. [Building the App](#building-the-app)
5. [Running on Android](#running-on-android)
6. [Running on iOS](#running-on-ios)
7. [Deploying to App Stores](#deploying-to-app-stores)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Both Platforms
- Node.js 16+ installed
- npm or yarn
- All frontend dependencies installed (`cd frontend && npm install`)

### For Android
- **Android Studio** (latest version)
  - Download: https://developer.android.com/studio
- **Java Development Kit (JDK)** 11 or higher
- Android SDK (installed via Android Studio)

### For iOS (macOS only)
- **Xcode** 14+ (from Mac App Store)
- **CocoaPods** (`sudo gem install cocoapods`)
- Apple Developer Account (for deploying to App Store)

---

## Firebase Setup (Required for Push Notifications)

Push notifications require Firebase Cloud Messaging (FCM).

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `6degree-mobile`
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Add Android App to Firebase
1. In Firebase Console, click "Add app" → Android icon
2. **Android package name**: `com.grapherly.sixdegree` (must match capacitor.config.ts)
3. Download `google-services.json`
4. Place it in: `frontend/android/app/google-services.json`

### Step 3: Add iOS App to Firebase (if building for iOS)
1. In Firebase Console, click "Add app" → iOS icon
2. **iOS bundle ID**: `com.grapherly.sixdegree`
3. Download `GoogleService-Info.plist`
4. Place it in: `frontend/ios/App/GoogleService-Info.plist`

### Step 4: Enable Cloud Messaging
1. In Firebase Console, go to Project Settings → Cloud Messaging
2. For Android: Copy "Server key" (you'll need this for Supabase Edge Function)
3. For iOS: Upload APNs key (from Apple Developer)
   - Go to Apple Developer → Certificates, IDs & Profiles → Keys
   - Create new key with APNs enabled
   - Download and upload to Firebase

### Step 5: Configure Supabase Edge Function
Set Firebase Server Key as environment variable in Supabase:

```bash
# In Supabase Dashboard → Edge Functions → Settings
FIREBASE_SERVER_KEY=your-firebase-server-key-here
```

---

## Database Migrations

Run the new migrations to add push notification support:

```bash
cd supabase

# Apply migration 027 (adds push_token columns to users table)
supabase db push --file migrations/027_add_push_notification_support.sql

# Apply migration 028 (adds notification triggers)
supabase db push --file migrations/028_add_notification_triggers.sql
```

### Enable pg_net Extension (Required for Notifications)
In Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set configuration for your project
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project-ref.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_key = 'your-service-role-key';
```

### Deploy Edge Function
```bash
cd supabase
supabase functions deploy send-push-notification
```

---

## Building the App

### Build Web Assets for Mobile
```bash
cd frontend
npm run build:mobile
```

This command:
- Builds the React app with Vite
- Syncs assets to Android and iOS projects
- Updates native plugins

### Manual Sync (if needed)
```bash
# Sync to Android only
npm run sync:android

# Sync to iOS only
npm run sync:ios
```

---

## Running on Android

### Option 1: Quick Open (Recommended)
```bash
cd frontend
npm run android
```

This builds and opens Android Studio automatically.

### Option 2: Manual Steps
```bash
# Build and sync
npm run build:mobile

# Open Android Studio
npm run open:android
```

### In Android Studio:
1. Wait for Gradle sync to complete
2. Select device or create emulator
   - Tools → Device Manager → Create Virtual Device
   - Recommended: Pixel 5 with Android 13+
3. Click "Run" (green play button) or press Shift+F10

### Testing Push Notifications
Push notifications only work on physical devices or emulators with Google Play Services.

---

## Running on iOS

**Note**: iOS development requires macOS.

### Add iOS Platform (first time only)
```bash
cd frontend
npx cap add ios
```

### Build and Open Xcode
```bash
npm run ios
```

### In Xcode:
1. Wait for CocoaPods installation
2. Select your team in Signing & Capabilities
3. Select device or simulator (iPhone 14+ recommended)
4. Click "Run" (▶️ button) or press Cmd+R

### Testing Push Notifications
- Push notifications only work on physical iOS devices
- Requires Apple Developer Account for signing

---

## Deploying to App Stores

### Android (Google Play Store)

#### 1. Generate Keystore
```bash
cd frontend/android
keytool -genkey -v -keystore release-key.keystore -alias 6degree -keyalg RSA -keysize 2048 -validity 10000
```

Save password and alias securely!

#### 2. Configure Signing
Edit `frontend/android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../release-key.keystore")
            storePassword "your-keystore-password"
            keyAlias "6degree"
            keyPassword "your-key-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

#### 3. Build Release APK/AAB
```bash
cd frontend/android
./gradlew bundleRelease  # For Play Store (AAB)
# OR
./gradlew assembleRelease  # For APK
```

Output: `frontend/android/app/build/outputs/bundle/release/app-release.aab`

#### 4. Upload to Google Play Console
1. Go to https://play.google.com/console
2. Create new app
3. Upload AAB file
4. Complete store listing, screenshots, etc.
5. Submit for review

---

### iOS (App Store)

#### 1. Configure App in Xcode
1. Open `frontend/ios/App/App.xcworkspace` in Xcode
2. Select App target → Signing & Capabilities
3. Select your team
4. Ensure bundle ID is `com.grapherly.sixdegree`

#### 2. Archive Build
1. In Xcode: Product → Archive
2. Wait for build to complete
3. Click "Distribute App"
4. Select "App Store Connect"
5. Follow wizard to upload

#### 3. Upload to App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Create new app
3. Complete app information
4. Add screenshots (use iOS Simulator)
5. Submit for review

---

## NPM Scripts Reference

```bash
# Development
npm run dev                 # Run web dev server

# Building
npm run build               # Build web app
npm run build:mobile        # Build and sync to native platforms

# Mobile Development
npm run android             # Build and open Android Studio
npm run ios                 # Build and open Xcode
npm run sync:android        # Sync web assets to Android
npm run sync:ios            # Sync web assets to iOS
npm run open:android        # Open Android Studio
npm run open:ios            # Open Xcode
```

---

## Features Implemented

### ✅ Push Notifications
- Firebase Cloud Messaging integration
- Automatic token registration
- Notifications for:
  - Connection requests received
  - Credits earned (referral join)
  - Chain updates
- Deep linking (tap notification → navigate to relevant screen)

### ✅ Camera Integration
- Take photos with device camera
- Select from photo gallery
- Ready for profile avatar upload

### ✅ Native Plugins
- **App**: App lifecycle events
- **Splash Screen**: Native launch screen
- **Status Bar**: iOS/Android status bar control
- **Keyboard**: Keyboard behavior management
- **Camera**: Photo capture and selection
- **Push Notifications**: FCM integration

---

## Troubleshooting

### Android

**Gradle sync fails:**
```bash
cd frontend/android
./gradlew clean
./gradlew build
```

**App crashes on startup:**
- Check `google-services.json` is in `frontend/android/app/`
- Verify package name matches Firebase: `com.grapherly.sixdegree`

**Push notifications not working:**
- Test on physical device or emulator with Google Play Services
- Check Firebase Server Key is set in Supabase Edge Function
- Verify notification permissions granted in app

### iOS

**CocoaPods issues:**
```bash
cd frontend/ios/App
pod deintegrate
pod install
```

**Signing errors:**
- Ensure you have an Apple Developer account
- Select your team in Xcode → Signing & Capabilities

**Push notifications not working:**
- Must test on physical device
- Verify APNs key uploaded to Firebase
- Check notification permissions granted

### General

**Web assets not updating:**
```bash
cd frontend
npm run build:mobile
```

**TypeScript errors:**
```bash
npm run lint
```

---

## Next Steps

1. **Set up Firebase** (priority for push notifications)
2. **Run database migrations**
3. **Deploy Supabase Edge Function**
4. **Test on Android device/emulator**
5. **Add app icons and splash screens**
6. **Test push notifications end-to-end**
7. **Prepare for app store submission**

---

## Support

For issues or questions:
- Check Capacitor docs: https://capacitorjs.com/docs
- Firebase docs: https://firebase.google.com/docs
- Supabase docs: https://supabase.com/docs

---

**Last Updated**: 2025-10-04
**Version**: 0.1.0-beta

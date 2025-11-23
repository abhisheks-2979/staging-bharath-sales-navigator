# Capacitor Android App Setup Guide

## Prerequisites
- Android Studio installed
- Node.js and npm installed
- Git installed

## Setup Steps

### 1. Export and Clone Project
1. In Lovable, click "Export to Github" button
2. Clone your repository locally:
```bash
git clone <your-repo-url>
cd <your-project>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Android Platform
```bash
npx cap add android
```

### 4. Update Native Platform
```bash
npx cap update android
```

### 5. Build the Web App
```bash
npm run build
```

### 6. Sync Changes to Native Platform
```bash
npx cap sync android
```

### 7. Open in Android Studio
```bash
npx cap open android
```

### 8. How Permissions Work

The app requests permissions **when you actually use the features**, just like any normal app:

#### **Location Permission**
- Requested when: You sign in, or access Attendance page for check-in/GPS tracking
- Options shown: "Allow while using the app", "Allow all the time", "Deny"
- Used for: Check-ins, GPS tracking, location-based features

#### **Camera Permission**  
- Requested when: You open the camera to take a photo (attendance, visit photos, etc.)
- Options shown: "Allow while using the app", "Allow once", "Deny"
- Used for: Attendance photos, visit documentation, branding photos

#### **Storage Permission** (Native only)
- Requested when: You sign in (for offline data storage)
- Options shown: "Allow", "Deny"
- Used for: Offline mode, caching data locally
- Note: In web browsers, storage is always available

### 9. Run on Device/Emulator

In Android Studio:
1. Select your device/emulator from the dropdown
2. Click the green "Run" button (or press Shift+F10)

Or from command line:
```bash
npx cap run android
```

## Testing Permissions

### Test Permission Flow:
1. **First Launch:**
   - Open app, no permissions requested yet
   - Sign in → Location permission dialog appears
   - Choose "Allow while using app" or "Allow all the time"

2. **Camera Access:**
   - Go to Attendance page
   - Click "Start Day" or "End Day"
   - Camera permission dialog appears
   - Choose "Allow while using app" or "Allow once"

3. **Deny & Re-request:**
   - If you deny a permission, the feature won't work
   - You can grant it later from Android Settings → Apps → Your App → Permissions

### Test Offline Mode:
1. Sign in and grant permissions
2. Let the app cache data (wait a few seconds)
3. Turn off WiFi and mobile data
4. Navigate to:
   - My Visits → should show cached visits
   - Cart → should work and queue orders
   - Beats → should show cached beats
   - Retailers → should show cached retailers
5. Turn internet back on
6. Pending orders should sync automatically

## Troubleshooting

### Permission dialogs not appearing?
- Make sure you're on a physical device or emulator with Play Services
- Check Android Settings → Apps → Your App → Permissions
- For web: Check browser console for permission errors
- Try clearing app data and relaunching

### "Permission denied" errors?
- Go to Android Settings → Apps → Your App → Permissions
- Manually grant required permissions
- Restart the app

### App not loading?
- Run `npm run build` followed by `npx cap sync android`
- Clean and rebuild in Android Studio

### Offline mode not working?
- Make sure Storage permission is granted
- Check that you're signed in before going offline
- Verify localStorage/IndexedDB is working in WebView

## After Making Changes

Every time you update code in Lovable:
1. Git pull changes: `git pull`
2. Install any new dependencies: `npm install`
3. Rebuild: `npm run build`
4. Sync to native: `npx cap sync android`
5. Reload app in Android Studio

## Building APK for Distribution

1. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
2. APK will be in: `android/app/build/outputs/apk/debug/`
3. For production: Use "Generate Signed Bundle" instead

## Important Notes

- **Permissions are requested when needed**, not on app startup
- Browser and native apps both show proper permission dialogs
- "Allow while using app" is recommended for location (saves battery)
- Storage permission enables offline data persistence
- Camera and location permissions are critical for core features
- The app is configured with hot-reload for development
- For production, update `capacitor.config.ts` to remove the server configuration

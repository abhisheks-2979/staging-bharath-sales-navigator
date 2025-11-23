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

### 8. Configure Permissions (Important!)

The app requires the following permissions for offline functionality:
- **Camera**: For attendance photos and visit documentation
- **Location**: For GPS tracking and check-ins
- **Storage**: For offline data storage

These are already configured in the app and will be requested automatically when the app starts and when signing in.

### 9. Run on Device/Emulator

In Android Studio:
1. Select your device/emulator from the dropdown
2. Click the green "Run" button (or press Shift+F10)

Or from command line:
```bash
npx cap run android
```

## Testing Offline Functionality

### Test Offline Mode:
1. Open the app and sign in
2. Grant all permissions (camera, location, storage)
3. Navigate to different pages (Order Entry, Cart, My Visits, Beats)
4. Turn off WiFi and mobile data
5. Verify:
   - App still works and shows cached data
   - Can add items to cart
   - Can view retailers and beats
   - Orders are queued for sync when back online
6. Turn internet back on
7. Verify pending items sync automatically

### Test Permissions:
1. On first launch, app should request:
   - Camera permission
   - Location permission  
   - Storage permission
2. If denied, features should still work but with limitations
3. Can re-request permissions from Android settings

## Troubleshooting

### Permissions not working?
- Check Android Settings > Apps > Your App > Permissions
- Make sure all required permissions are granted

### App not loading?
- Run `npm run build` followed by `npx cap sync android`
- Clean and rebuild in Android Studio

### Offline mode not working?
- Check browser console for errors
- Verify localStorage is enabled in WebView
- Make sure service worker is registered

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

- The app is configured with hot-reload pointing to the Lovable sandbox for development
- For production, update `capacitor.config.ts` to remove the server configuration
- Always sync after updating web assets: `npx cap sync android`
- Storage permission enables offline data persistence
- Camera and location permissions are requested on-demand

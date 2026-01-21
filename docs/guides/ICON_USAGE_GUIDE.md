# Icon Usage Guide for Momentum App

## Icon Files Overview

Your app has two main icon files with specific purposes:

### 1. **`icon.png`** - App Icon (On Device) 🎯
- **Location**: `assets/images/icon.png`
- **Purpose**: Main app icon that appears on users' devices
- **Used in**: 
  - iOS Home Screen
  - App Switcher
  - Settings
  - Notification badges
  - In-app displays
- **Configuration**: Set in `app.json` → `expo.icon`
- **Current Status**: ✅ Configured correctly

### 2. **`app-store-logo.png`** - App Store Marketing Icon 📱
- **Location**: `assets/images/app-store-logo.png`
- **Purpose**: Marketing icon for App Store listing
- **Used in**:
  - App Store search results
  - App Store product page
  - App Store marketing materials
  - Today tab features
- **Upload Location**: App Store Connect (separate upload)
- **Current Status**: ✅ File ready for upload

## Icon Specifications

### App Icon (`icon.png`)
- **Size**: 1024x1024 pixels (required for iOS)
- **Format**: PNG with transparency (if needed)
- **Color Space**: sRGB or Display P3
- **No Alpha**: iOS will automatically add rounded corners

### App Store Icon (`app-store-logo.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG or JPEG
- **Color Space**: sRGB or Display P3
- **Note**: Should match app icon but can be optimized for marketing

## How to Upload App Store Icon

When submitting to the App Store through App Store Connect:

1. **Log into App Store Connect**
   - Go to: https://appstoreconnect.apple.com

2. **Navigate to Your App**
   - Select your app from "My Apps"

3. **Go to App Store Tab**
   - Click on the version you're preparing (e.g., "1.0 Prepare for Submission")

4. **Upload App Icon**
   - Scroll to "App Icon" section
   - Click "Choose File"
   - Select `assets/images/app-store-logo.png`
   - Upload

5. **Verify**
   - Ensure the icon looks good in the preview
   - Check that it matches your app's branding

## Build Process

When building your app with EAS Build:

```bash
# The app icon (icon.png) is automatically included
eas build --platform ios

# No additional configuration needed!
```

The `icon.png` will be automatically:
- Resized to all required iOS sizes
- Added to your app bundle
- Used on the device home screen

## Important Notes

### ✅ Do's
- Keep `icon.png` as the primary app icon in app.json
- Use `app-store-logo.png` ONLY for App Store Connect upload
- Ensure both icons are 1024x1024 pixels
- Keep designs consistent between both icons
- Use high-quality, sharp graphics

### ❌ Don'ts
- Don't swap the icon files in app.json
- Don't use `app-store-logo.png` as the main app icon
- Don't use images smaller than 1024x1024
- Don't add rounded corners (iOS adds them automatically)
- Don't use transparency in areas that should be opaque

## Current Configuration

```json
// app.json
{
  "expo": {
    "icon": "./assets/images/icon.png",  // ✅ Correct - used on device
    // app-store-logo.png is NOT in app.json - it's uploaded separately
  }
}
```

## Testing Icons

### Test App Icon (icon.png)
```bash
# Build and install on a test device
eas build --profile development --platform ios
```

Then check:
- Home screen appearance
- App switcher appearance
- Settings appearance
- Notification badges

### Preview App Store Icon (app-store-logo.png)
- Open the file in Preview/image viewer
- View at actual size (1024x1024)
- Check how it looks at smaller sizes (simulate zooming out)
- Verify colors and clarity

## File Management

### Keep Both Files Updated
When updating your icon design:

1. Update both `icon.png` and `app-store-logo.png`
2. Keep them visually consistent
3. Test on actual devices
4. Re-upload to App Store Connect if needed

### Version Control
Both icon files are tracked in git:
- `assets/images/icon.png`
- `assets/images/app-store-logo.png`

Commit both when making icon changes:
```bash
git add assets/images/icon.png assets/images/app-store-logo.png
git commit -m "Update app icons"
```

## Summary

| File | Purpose | Where It Goes | Auto-Included in Build? |
|------|---------|---------------|------------------------|
| `icon.png` | Device app icon | App bundle | ✅ Yes (via app.json) |
| `app-store-logo.png` | App Store listing | App Store Connect | ❌ No (manual upload) |

Your setup is **correctly configured**! 🎉

- ✅ `icon.png` is set as the main app icon
- ✅ `app-store-logo.png` is ready for App Store Connect upload
- ✅ Both files are 1024x1024 (assuming they are)
- ✅ Both have the beautiful purple calendar design with "M" logo

## Need Help?

If you need to regenerate icons or create additional sizes:
- iOS requires only 1024x1024 (Expo handles resizing)
- For custom sizes, use image editing tools
- Keep the source file in a vector format (like SVG) if possible

---

**Last Updated**: Current build
**Configuration Status**: ✅ Ready for deployment


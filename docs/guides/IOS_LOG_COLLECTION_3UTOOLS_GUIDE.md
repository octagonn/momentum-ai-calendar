# iOS Log Collection Guide - 3uTools (Windows)

## Complete Guide for Debugging In-App Purchase Issues

This guide provides step-by-step instructions for collecting iOS device logs using 3uTools on Windows to debug TestFlight in-app purchase failures.

## Prerequisites

1. **3uTools installed** on your Windows computer
2. **iPhone connected** via USB cable to your Windows PC
3. **TestFlight app** installed with your app build
4. **Sandbox Apple ID** logged into Settings > Media & Purchases
5. **Trust established** between iPhone and Windows PC

## Step-by-Step Log Collection Process

### Step 1: Prepare Your iPhone
1. Connect your iPhone to your Windows PC via USB
2. On your iPhone, tap "Trust This Computer" when prompted
3. Enter your iPhone passcode if requested
4. Ensure your sandbox Apple ID is logged into Settings > Media & Purchases

### Step 2: Open 3uTools and Access Real-Time Logs
1. **Launch 3uTools** on your Windows PC
2. Your iPhone should appear in the device list at the top
3. Click on the **"Toolbox"** tab in the top menu
4. Look for **"Real-time Logs"** or **"Live Console"** option
   - This might be under "Advanced Features" or "Developer Tools"
   - The exact location may vary by 3uTools version

### Step 3: Configure Log Filtering
1. In the Real-time Logs window:
   - **Clear existing logs** (usually a "Clear" button)
   - **Set log level** to "All" or "Debug" (highest verbosity)
   - **Enable filtering** for your app:
     - App name: "Momentum iOS App"
     - Bundle ID: "com.momentumaicalendar.app"
     - Process name: Look for processes containing "momentum" or "app"

### Step 4: Start Log Capture
1. **Click "Start"** or "Begin Logging" in 3uTools
2. You should see live log messages scrolling
3. **Filter for relevant processes**:
   - Look for logs from `storekit`
   - Look for logs from `itunesstored`
   - Look for logs from your app bundle ID
   - Look for logs containing "purchase", "subscription", "receipt"

### Step 5: Reproduce the Purchase Issue
1. **Keep 3uTools logging active**
2. On your iPhone:
   - Open your TestFlight app
   - Navigate to Settings
   - Tap "Upgrade to Pro"
   - Tap "Start Premium Now"
   - **Wait for the error popup** to appear
   - Note the exact time when the error occurs

### Step 6: Capture and Export Logs
1. **Stop logging** in 3uTools after the error occurs
2. **Save the logs**:
   - Look for "Export" or "Save" button
   - Save as text file: `ios_purchase_logs_[date].txt`
   - Choose a location you can easily find

## Key Log Messages to Look For

When analyzing the exported logs, search for these critical patterns:

### StoreKit Errors
```
storekit: Error Domain=SKErrorDomain
storekit: SKPaymentQueue
storekit: Product request failed
storekit: Payment failed with error
```

### iTunes Store Errors
```
itunesstored: Purchase failed
itunesstored: Authentication failed
itunesstored: Product not available
itunesstored: Network error
```

### App-Specific Errors
```
com.momentumaicalendar.app: Purchase error
com.momentumaicalendar.app: IAP initialization failed
com.momentumaicalendar.app: Subscription request failed
```

### React Native IAP Errors
```
RNIap: Error occurred
RNIap: Product fetch failed
RNIap: Purchase listener error
```

## Common Error Codes and Meanings

| Error Code | Meaning | Solution |
|------------|---------|----------|
| SKError 0 | Unknown error | Check network, retry |
| SKError 1 | Client invalid | App Store configuration issue |
| SKError 2 | Payment cancelled | User cancelled (normal) |
| SKError 3 | Payment invalid | Product/payment configuration |
| SKError 4 | Payment not allowed | Restrictions enabled |
| SKError 5 | Store product not available | Product not configured in App Store Connect |

## Alternative Log Collection Methods

If 3uTools Real-time Logs doesn't work:

### Method 1: System Information Logs
1. In 3uTools, go to **"Device Info"**
2. Look for **"System Logs"** or **"Crash Logs"**
3. Export recent logs and search for your app's bundle ID

### Method 2: Console App Export
1. Some 3uTools versions have a **"Console"** feature
2. This mirrors the macOS Console app functionality
3. Filter by your app's process name

### Method 3: Device Backup Analysis
1. Create a backup using 3uTools
2. Use backup analysis tools to extract log files
3. Look for `.log` files related to StoreKit or your app

## Troubleshooting 3uTools Connection

If 3uTools doesn't show logs:

1. **Restart both** iPhone and 3uTools
2. **Try different USB cable/port**
3. **Disable antivirus** temporarily (may block device access)
4. **Update 3uTools** to latest version
5. **Enable Developer Mode** on iPhone (Settings > Privacy & Security > Developer Mode)

## What to Send for Analysis

After collecting logs, look for and send:

1. **Complete error messages** with timestamps
2. **StoreKit error codes** (SKError numbers)
3. **Network-related errors** (connection failures)
4. **App Store Connect errors** (product availability)
5. **Receipt verification errors** (if any)

## Expected Log Flow for Successful Purchase

A successful purchase should show this sequence:
1. `Product request initiated`
2. `Products fetched successfully`
3. `Payment request sent to StoreKit`
4. `Payment queue updated`
5. `Transaction state: purchasing`
6. `Transaction state: purchased`
7. `Receipt received`
8. `Receipt verification initiated`

## Next Steps After Log Collection

1. **Search for specific error codes** in the logs
2. **Note the exact timestamp** when the error occurs
3. **Check if products are being fetched** successfully
4. **Verify if the payment request** reaches StoreKit
5. **Look for network connectivity issues**

## Contact Information

After collecting logs, please share:
- The exported log file
- Exact error messages with timestamps
- Your TestFlight build number
- iOS version of your test device
- Sandbox account email (without password)

This information will help identify whether the issue is:
- App Store Connect configuration
- StoreKit integration
- Network connectivity
- Sandbox environment
- Code implementation

---

**Note**: 3uTools interface may vary by version. If you can't find "Real-time Logs", look for similar features like "Console", "Device Logs", or "Live Monitor".

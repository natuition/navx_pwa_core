# iOS (Capacitor) — Build & Run Guide

This document explains how to build and run the app on iPhone with Capacitor, and how to enable live reload. It also covers BLE specifics and the iPhone notch (safe area).

## Prerequisites

- macOS with Xcode installed (version compatible with your iOS).
- Apple ID added in Xcode (Xcode > Settings > Accounts).
- iPhone in Developer Mode (iOS 16+): Settings > Privacy & Security > Developer Mode > Enable (device restarts).
- USB cable (or Wi‑Fi pairing) and “Trust this computer” accepted on the iPhone.

## Web build + Capacitor integration

- Install dependencies and build the web app:

```zsh
npm install
npm run build
```

- Copy the built web assets into the iOS Capacitor project:

```zsh
npx cap copy ios
```

- If you just added/updated native plugins, prefer:

```zsh
npx cap sync ios
```

- Open the iOS project in Xcode:

```zsh
npx cap open ios
```

Notes:
- `capacitor.config.ts` is configured with `webDir: 'dist'`.
- The PWA is served by Vite in production build (the `dist` folder is copied under `ios/App/App/public`).

## Run on a physical iPhone

1) In Xcode, pick the target “App” and select your iPhone as the destination (top of the window).
2) Go to the “Signing & Capabilities” tab:
   - Check “Automatically manage signing”.
   - Select your “Team” (Apple ID account).
   - If the Bundle Identifier is already taken, change it to a unique one (e.g., `com.yourorg.navx`).
3) Click ▶ (Run) to install and launch the app on the iPhone.
4) On first launch, iOS may prompt for Bluetooth permission.

iOS BLE permissions:
- `Info.plist` contains `NSBluetoothAlwaysUsageDescription` with a user-facing message. If you want to change it, edit `ios/App/App/Info.plist`.

## BLE specifics (PWA vs Native app)

- iOS app (Capacitor): BLE works via the `@capacitor-community/bluetooth-le` plugin.
- iOS PWA (Safari / Home screen): Web Bluetooth is not supported, BLE won’t work.
- PWA Desktop/Android (Chrome/Edge): Web Bluetooth works over HTTPS (or localhost).

Our `BluetoothService` automatically selects the native (Capacitor) or Web path based on the environment.

## Notch / Safe Area (UI)

- The page includes `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.
- CSS uses `env(safe-area-inset-top/bottom)` so the header and controls don’t sit under the notch.

## Troubleshooting

- Device not visible in Xcode:
  - Check cable/USB, “Trust this computer”, Developer Mode enabled, Xcode and iOS versions compatible.
- Signing errors:
  - Select a Team, enable “Automatically manage signing”, change the Bundle Identifier if necessary.
- Live reload doesn’t load on iPhone:
  - Check your Mac’s IP and firewall, same network, exact URL (`http://<ip>:5173`).
  - Try `npx cap run ios` after starting `npm run dev`.
- CLI: `--external` not recognized:
  - Use `DEV_SERVER_URL=... npx cap run ios` (the `--external` flag isn’t supported by your Capacitor CLI version).
- BLE: “GATT operation already in progress” (Web Bluetooth):
  - We added retry/backoff and slightly increased inter‑chunk delay on the Web path. If it persists, increase the Web inter‑chunk delay in `BluetoothService` to 10–12 ms or reduce the chunk size.

## Release (short)

- In Xcode: Product > Archive, then Organizer > Distribute App (Ad Hoc/TestFlight/App Store). Configure profiles and certificates based on your distribution target.

---

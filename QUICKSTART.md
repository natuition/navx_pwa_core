# Quick Start Guide

Get up and running with NavX PWA in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- Chrome, Edge, or Opera browser (for Web Bluetooth)
- GNSS receiver with BLE support (optional for testing)

## Installation

```bash
# Clone the repository
git clone https://github.com/natuition/navx_pwa_core.git
cd navx_pwa_core

# Install dependencies
npm install
```

## Configure Mapbox Token

1. Get a free Mapbox token at https://account.mapbox.com/
2. Open `src/components/MapView.tsx`
3. Replace the placeholder token on line 9:

```typescript
mapboxgl.accessToken = 'YOUR_ACTUAL_TOKEN_HERE';
```

See [MAPBOX_TOKEN.md](MAPBOX_TOKEN.md) for detailed instructions.

## Run Development Server

```bash
npm run dev
```

Open your browser to http://localhost:5173 (or the port shown)

## Build for Production

```bash
npm run build
```

The optimized build will be in the `dist` directory.

## Test the Build

```bash
npm run preview
```

## Using the App

### 1. Connect to GNSS Device

1. Click "Connect BLE" button in the header
2. Browser will show Bluetooth pairing dialog
3. Select your GNSS receiver
4. Device should start streaming NMEA data

**Note:** Your GNSS device must support Nordic UART Service (NUS)

### 2. Connect to NTRIP Caster

1. Click "Connect NTRIP" button (enabled after BLE connection)
2. Enter your NTRIP caster details:
   - **Host:** rtk2go.com (or your caster)
   - **Port:** 2101 (standard NTRIP port)
   - **Mountpoint:** Your base station mountpoint
   - **Username/Password:** Optional (depends on caster)
3. Click "Connect"

### 3. View Your Position

Switch between tabs:
- **Map:** See your GPS position on Mapbox map
- **Info:** View satellites, fix type, and sky diagram

## Testing Without Hardware

If you don't have a GNSS receiver:

1. The app will still load and show the UI
2. Map will display but without a position marker
3. Info tab will show "No Fix" status
4. You can explore the interface and dialogs

## Deployment

For production deployment:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to any static hosting:
   - Netlify
   - Vercel
   - GitHub Pages
   - Firebase Hosting
   - AWS S3 + CloudFront

3. **Important:** Must be served over HTTPS (Web Bluetooth requirement)

### Deploy to Netlify (Example)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

## Troubleshooting

### Bluetooth doesn't work
- ✅ Use Chrome, Edge, or Opera browser
- ✅ Ensure site is served over HTTPS
- ✅ Check device is powered on and in range
- ❌ Safari and Firefox don't support Web Bluetooth

### Map doesn't load
- ✅ Verify Mapbox token is set correctly
- ✅ Check browser console for errors
- ✅ Ensure internet connection

### NTRIP connection fails
- ✅ Verify caster address and port
- ✅ Check mountpoint name is correct
- ✅ Confirm credentials if required
- ✅ Some casters may need WebSocket proxy

#### Using the included WebSocket->TCP proxy (dev only)

Browsers cannot open raw TCP sockets. Many NTRIP casters speak plain TCP on port 2101. To test connecting from the browser, you can run the included lightweight WebSocket->TCP proxy locally.

1. Start the proxy from the project root:

```bash
# install dependencies if needed
npm install ws
node ntrip-ws-proxy.js --listenPort 8080
```

2. In the app, set the NTRIP "WebSocket URL" (advanced) to:

```
ws://localhost:8080/?host=crtk.net&port=2101
```

The proxy will forward WebSocket frames to the TCP host:port you provide in the query string. This proxy is intended for local development only.

## Project Structure

```
navx_pwa_core/
├── src/
│   ├── components/        # React components
│   ├── bluetooth-service.ts
│   ├── ntrip-client.ts
│   ├── nmea-parser.ts
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── public/               # Static assets
├── dist/                # Build output
└── docs/               # Documentation
```

## NPM Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Learn More

- [README.md](README.md) - Features and overview
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [MAPBOX_TOKEN.md](MAPBOX_TOKEN.md) - Mapbox setup

## Next Steps

1. ✅ Set up Mapbox token
2. ✅ Test with your GNSS device
3. ✅ Configure NTRIP caster
4. ✅ Deploy to production
5. ⭐ Customize for your needs!

## Support

- Report issues on GitHub
- Check documentation files
- Review browser console for errors

## License

MIT License - see LICENSE file for details

---

**Ready to go!** Run `npm run dev` and start testing! 🚀

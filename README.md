# navx_pwa_core

Progressive Web App for connecting GNSS/BLE devices to NTRIP casters, streaming RTCM corrections, and visualizing GPS positions in real time.

## Features

- **Web Bluetooth Integration**: Connect to GNSS receivers via Bluetooth Low Energy (BLE)
- **NTRIP Client**: Stream RTCM corrections from NTRIP casters
- **Real-time GPS Visualization**: Display corrected GPS positions on an interactive Mapbox map
- **Satellite Information**: View satellite details including:
  - Sky view diagram showing satellite positions
  - Satellite ID, elevation, azimuth, and SNR (Signal-to-Noise Ratio)
  - Fix type (No Fix, GPS, DGPS, RTK Float, RTK Fixed)
  - HDOP (Horizontal Dilution of Precision)
- **NMEA Parsing**: Parse and process NMEA sentences from GPS devices
- **RTCM Forwarding**: Forward RTCM corrections to the connected BLE device
- **PWA Support**: Install on mobile devices and use offline
- **Mobile-Friendly**: Responsive design optimized for mobile devices

## Architecture

```
┌─────────────────┐
│  GNSS Receiver  │
│  (BLE Device)   │
└────────┬────────┘
         │ NMEA (via BLE)
         ▼
┌─────────────────┐
│   React PWA     │
│  (This App)     │
└────────┬────────┘
         │ RTCM
         │ ┌──────────────┐
         └─│ NTRIP Caster │
           └──────────────┘
```

The app receives NMEA data from a GNSS receiver via Bluetooth, parses it to extract position and satellite information, connects to an NTRIP caster to receive RTCM corrections, and forwards these corrections back to the GNSS receiver for improved accuracy.

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast builds and development
- **Web Bluetooth API** for BLE connectivity
- **Mapbox GL JS** for mapping
- **WebSocket** for NTRIP communication
- **Service Worker** for PWA capabilities

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Bluetooth-enabled device (with Web Bluetooth support)
- A GNSS receiver with BLE capability
- (Optional) NTRIP caster credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/natuition/navx_pwa_core.git
cd navx_pwa_core
```

2. Install dependencies:
```bash
npm install
```

3. Set your Mapbox access token:
   - Get a free token at https://account.mapbox.com/
   - Update the token in `src/components/MapView.tsx`

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to the URL shown (typically http://localhost:5173)

### Building for Production

```bash
npm run build
npm run preview
```

The built files will be in the `dist` directory.

## Usage

1. **Connect BLE Device**:
   - Click "Connect BLE" button
   - Select your GNSS receiver from the browser's Bluetooth pairing dialog
   - The device should support Nordic UART Service (NUS)

2. **Connect to NTRIP**:
   - Click "Connect NTRIP" button
   - Enter your NTRIP caster details:
     - Host (e.g., rtk2go.com)
     - Port (e.g., 2101)
     - Mountpoint
     - Username (optional)
     - Password (optional)
   - Click "Connect"

3. **View Position**:
   - Switch to the "Map" tab to see your GPS position
   - The map will center on your location automatically

4. **View Satellite Info**:
   - Switch to the "Info" tab
   - See fix type, satellite count, and HDOP
   - View the sky diagram showing satellite positions
   - Check detailed satellite information including SNR

## Browser Compatibility

Web Bluetooth is required for BLE connectivity. Supported browsers:
- Chrome/Edge 56+ (Desktop & Android)
- Opera 43+
- Samsung Internet 6.0+

Note: Safari and Firefox do not currently support Web Bluetooth.

## NTRIP Caster Support

The app uses WebSocket connections to communicate with NTRIP casters. Some NTRIP casters may require a WebSocket-to-TCP proxy service. For production use, you may need to set up your own proxy server.

Popular free NTRIP casters:
- RTK2GO (rtk2go.com:2101)
- SNIP (various providers)

## Modules

### Core Services

- **bluetooth-service.ts**: Handles Web Bluetooth connections and UART communication
- **ntrip-client.ts**: Manages NTRIP caster connections and RTCM data streaming
- **nmea-parser.ts**: Parses NMEA sentences and extracts GPS data

### Components

- **App.tsx**: Main application component
- **MapView.tsx**: Mapbox map integration
- **InfoTab.tsx**: Satellite information display with sky view
- **NtripDialog.tsx**: NTRIP configuration dialog

## Development

### Project Structure

```
src/
├── components/         # React components
│   ├── InfoTab.tsx     # Satellite info and sky view
│   ├── MapView.tsx     # Mapbox map component
│   └── NtripDialog.tsx # NTRIP configuration dialog
├── bluetooth-service.ts  # BLE connection handler
├── ntrip-client.ts      # NTRIP client
├── nmea-parser.ts       # NMEA sentence parser
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app component
├── main.tsx             # App entry point
└── index.css            # Global styles
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Troubleshooting

### Bluetooth Connection Issues

- Ensure your GNSS device is powered on and in pairing mode
- Check that your browser supports Web Bluetooth
- Try refreshing the page and reconnecting

### NTRIP Connection Issues

- Verify your NTRIP credentials are correct
- Check that the mountpoint exists on the caster
- Some casters may require HTTPS or a proxy service

### Map Not Loading

- Verify your Mapbox access token is set correctly
- Check browser console for errors
- Ensure you have an internet connection

## Acknowledgments

- Built with React and TypeScript
- Uses Mapbox GL JS for mapping
- Implements Web Bluetooth API for device connectivity

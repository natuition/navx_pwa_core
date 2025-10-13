# Architecture & Data Flow

## System Overview

The NavX PWA Core is a Progressive Web App that bridges GNSS receivers and NTRIP casters, providing real-time GPS positioning with RTK corrections.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React PWA (Browser)                      │
│                                                                   │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────────┐ │
│  │  UI Layer   │◄────►│  State Mgmt  │◄────►│  Service Layer │ │
│  │             │      │   (Hooks)    │      │                │ │
│  │ - MapView   │      │              │      │ - BLE Service  │ │
│  │ - InfoTab   │      │ - position   │      │ - NTRIP Client │ │
│  │ - Dialogs   │      │ - satellites │      │ - NMEA Parser  │ │
│  └─────────────┘      │ - fixType    │      └────────────────┘ │
│                       │ - connections │                          │
│                       └──────────────┘                           │
│                                                                   │
└───────────┬───────────────────────────────────────┬─────────────┘
            │                                       │
            │ Web Bluetooth API                     │ WebSocket
            │ (NMEA in, RTCM out)                  │ (RTCM in)
            ▼                                       ▼
    ┌───────────────┐                     ┌─────────────────┐
    │ GNSS Receiver │                     │  NTRIP Caster   │
    │  (BLE Device) │                     │   (TCP Server)  │
    └───────────────┘                     └─────────────────┘
```

## Data Flow

### 1. BLE Connection Flow

```
User clicks "Connect BLE"
    ↓
BluetoothService.connect()
    ↓
Browser shows Bluetooth pairing dialog
    ↓
User selects GNSS device
    ↓
Connect to GATT server
    ↓
Get UART service (Nordic UART)
    ↓
Subscribe to TX characteristic (notifications)
    ↓
Start receiving NMEA data
    ↓
Data flows to NmeaParser
```

### 2. NMEA Processing Flow

```
Raw NMEA sentences (from BLE)
    ↓
NmeaParser.parse()
    ↓
Identify sentence type (GGA, RMC, GSV)
    ↓
Extract relevant data:
  - GGA: position, altitude, fix quality, HDOP
  - RMC: position, time, date
  - GSV: satellite info (ID, elevation, azimuth, SNR)
    ↓
Update React state (via callbacks)
    ↓
UI updates automatically (React re-render)
    ↓
MapView: Update marker position
InfoTab: Update satellite display
```

### 3. NTRIP Connection Flow

```
User clicks "Connect NTRIP"
    ↓
Show NTRIP configuration dialog
    ↓
User enters credentials and mountpoint
    ↓
NtripClient.connect(config)
    ↓
Create WebSocket connection
    ↓
Send NTRIP HTTP request with auth
    ↓
Receive RTCM correction data
    ↓
Forward to BluetoothService
    ↓
Send to GNSS receiver (in 20-byte chunks)
    ↓
GNSS applies corrections
    ↓
Improved fix quality (RTK Float/Fixed)
```

### 4. Complete Correction Loop

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  GNSS Receiver                                  │
│  (in the field)                                 │
│                                                  │
│  1. Receives satellite signals                  │
│  2. Calculates position (standard GPS)          │
│  3. Sends NMEA via BLE ─────────────────┐       │
│  4. Receives RTCM via BLE ◄─────────┐   │       │
│  5. Applies corrections              │   │       │
│  6. Calculates RTK position          │   │       │
│  7. Sends improved NMEA ─────────┐   │   │       │
│                                  │   │   │       │
└──────────────────────────────────┼───┼───┼───────┘
                                   │   │   │
                                   ▼   │   ▼
                            ┌──────────────────────┐
                            │                      │
                            │   React PWA App      │
                            │                      │
                            │  - Parse NMEA        │
                            │  - Display position  │
                            │  - Show satellites   │
                            │  - Forward RTCM      │
                            │                      │
                            └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │                      │
                            │   NTRIP Caster       │
                            │                      │
                            │  - Receives request  │
                            │  - Streams RTCM      │
                            │                      │
                            └──────────────────────┘
```

## Component Architecture

### 1. App.tsx (Main Orchestrator)

**Responsibilities:**
- Central state management
- Coordinate between services
- Handle user interactions
- Manage tab navigation
- Display status information

**State:**
```typescript
- position: GpsPosition | null
- bleConnected: boolean
- ntripConnected: boolean
- fixType: FixType
- satellites: SatelliteInfo[]
- hdop: number
- numSatellites: number
```

**Services:**
```typescript
- bluetoothService: BluetoothService
- ntripClient: NtripClient
- nmeaParser: NmeaParser
```

### 2. BluetoothService

**Responsibilities:**
- Manage Web Bluetooth connections
- Handle GATT server operations
- Read NMEA data from device
- Write RTCM data to device
- Handle connection events

**Key Methods:**
```typescript
connect(): Promise<void>
disconnect(): Promise<void>
write(data: ArrayBuffer): Promise<void>
onData(callback: (data: string) => void): void
isConnected(): boolean
```

### 3. NtripClient

**Responsibilities:**
- Connect to NTRIP caster via WebSocket
- Authenticate with Basic Auth
- Receive RTCM correction data
- Handle reconnection
- Stream data to callbacks

**Key Methods:**
```typescript
connect(config: NtripConfig): Promise<void>
disconnect(): void
onData(callback: (data: ArrayBuffer) => void): void
isConnected(): boolean
```

### 4. NmeaParser

**Responsibilities:**
- Parse NMEA sentences
- Extract position data
- Process satellite information
- Calculate fix quality
- Maintain satellite state

**Key Methods:**
```typescript
parse(sentence: string): NmeaData | null
getSatellites(): SatelliteInfo[]
clearSatellites(): void
```

### 5. MapView Component

**Responsibilities:**
- Initialize Mapbox map
- Display GPS position marker
- Center map on location updates
- Provide navigation controls

**Props:**
```typescript
position: GpsPosition | null
```

### 6. InfoTab Component

**Responsibilities:**
- Display fix status
- Render satellite sky view
- Show satellite details table
- Visualize SNR levels

**Props:**
```typescript
satellites: SatelliteInfo[]
fixType: FixType
hdop?: number
numSatellites?: number
```

### 7. NtripDialog Component

**Responsibilities:**
- Collect NTRIP configuration
- Validate user input
- Submit connection request

**Props:**
```typescript
isOpen: boolean
onClose: () => void
onConnect: (config: NtripConfig) => void
```

## State Management

### React Hooks Pattern

The app uses React hooks for state management:

```typescript
// Connection state
const [bleConnected, setBleConnected] = useState(false);
const [ntripConnected, setNtripConnected] = useState(false);

// GPS data state
const [position, setPosition] = useState<GpsPosition | null>(null);
const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
const [fixType, setFixType] = useState<FixType>(FixType.NO_FIX);

// Service instances (persistent across renders)
const [bluetoothService] = useState(() => new BluetoothService());
const [ntripClient] = useState(() => new NtripClient());
const [nmeaParser] = useState(() => new NmeaParser());

// UI state
const [activeTab, setActiveTab] = useState<TabType>('map');
const [showNtripDialog, setShowNtripDialog] = useState(false);
```

### Data Update Flow

```
BLE receives data
    ↓
processNmeaData() callback
    ↓
nmeaParser.parse()
    ↓
Update state with setPosition(), setSatellites(), etc.
    ↓
React triggers re-render
    ↓
Components receive new props
    ↓
UI updates automatically
```

## PWA Features

### Service Worker

Generated by Vite PWA plugin:

```typescript
// Precaches all static assets
precache: ['index.html', 'assets/*.js', 'assets/*.css']

// Runtime caching for Mapbox
runtimeCaching: [
  {
    urlPattern: /^https:\/\/api\.mapbox\.com\/.*/,
    handler: 'CacheFirst',
    cacheName: 'mapbox-cache'
  }
]
```

### Web App Manifest

```json
{
  "name": "NavX PWA Core",
  "short_name": "NavX",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#007bff",
  "background_color": "#ffffff"
}
```

## Error Handling

### Connection Errors

```typescript
// BLE connection failures
try {
  await bluetoothService.connect();
} catch (error) {
  console.error('Bluetooth connection failed:', error);
  alert('Failed to connect to Bluetooth device...');
}

// NTRIP connection failures
try {
  await ntripClient.connect(config);
} catch (error) {
  console.error('NTRIP connection failed:', error);
  alert('Failed to connect to NTRIP caster...');
}
```

### Disconnection Handling

```typescript
// Automatic reconnection for NTRIP
private handleDisconnect(): void {
  if (this.shouldReconnect && this.config) {
    setTimeout(() => {
      this.doConnect().catch(console.error);
    }, 5000);
  }
}

// BLE disconnection events
device.addEventListener('gattserverdisconnected', 
  this.handleDisconnect.bind(this));
```

## Performance Considerations

### 1. BLE Data Chunking

RTCM data is sent in 20-byte chunks due to BLE MTU limitations:

```typescript
const chunkSize = 20;
for (let i = 0; i < dataArray.length; i += chunkSize) {
  const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
  await rxCharacteristic.writeValue(chunk);
}
```

### 2. NMEA Buffering

Incomplete NMEA sentences are buffered:

```typescript
const newBuffer = nmeaBuffer + data;
const lines = newBuffer.split('\n');
setNmeaBuffer(lines[lines.length - 1]); // Keep incomplete line
```

### 3. React Re-render Optimization

State updates are batched to minimize re-renders:

```typescript
// Multiple state updates in single callback
setPosition({ ...positionData });
setFixType(fixQuality);
setNumSatellites(numSats);
setSatellites(nmeaParser.getSatellites());
```

## Security Considerations

### 1. Web Bluetooth

- User must explicitly approve device pairing
- Browser security model prevents unauthorized access
- Only works over HTTPS in production

### 2. NTRIP Authentication

- Credentials transmitted over secure WebSocket (wss://)
- Basic Auth encoded in base64
- No credentials stored in localStorage

### 3. Mapbox Token

- Public token safe to expose in client code
- Can be restricted by URL referrer
- Rate limited by Mapbox

## Browser API Requirements

### Web Bluetooth
```javascript
navigator.bluetooth.requestDevice()
device.gatt.connect()
service.getCharacteristic()
characteristic.startNotifications()
characteristic.writeValue()
```

### WebSocket
```javascript
new WebSocket(url)
socket.send()
socket.onmessage
```

### Service Worker
```javascript
navigator.serviceWorker.register()
```

## Future Enhancements

Possible improvements:
- IndexedDB for storing GPS tracks
- WebRTC for P2P RTCM sharing
- Geolocation API fallback
- Multiple NTRIP mountpoint support
- Custom map tile sources
- Export GPS data (GPX, KML)
- Real-time track visualization
- Battery optimization modes

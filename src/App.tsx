import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { MapView } from './components/MapView';
import { InfoTab } from './components/InfoTab';
import { NtripDialog } from './components/NtripDialog';
import { BluetoothService } from './bluetooth-service';
import { NtripClient } from './ntrip-client';
import { NmeaParser } from './nmea-parser';
import { GpsPosition, NtripConfig, FixType, SatelliteInfo } from './types';

type TabType = 'map' | 'info';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [bleConnected, setBleConnected] = useState(false);
  const [ntripConnected, setNtripConnected] = useState(false);
  const [showNtripDialog, setShowNtripDialog] = useState(false);
  const [fixType, setFixType] = useState<FixType>(FixType.NO_FIX);
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [hdop, setHdop] = useState<number | undefined>();
  const [numSatellites, setNumSatellites] = useState<number | undefined>();
  
  const [bluetoothService] = useState(() => new BluetoothService());
  const [ntripClient] = useState(() => new NtripClient());
  const [nmeaParser] = useState(() => new NmeaParser());
  const [nmeaBuffer, setNmeaBuffer] = useState('');

  // Process incoming NMEA data
  const processNmeaData = useCallback((data: string) => {
    const newBuffer = nmeaBuffer + data;
    const lines = newBuffer.split('\n');
    
    // Keep the last incomplete line in the buffer
    setNmeaBuffer(lines[lines.length - 1]);

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line.startsWith('$')) {
        const parsed = nmeaParser.parse(line);
        
        if (parsed) {
          // Update position
          if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
            setPosition({
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              altitude: parsed.altitude,
              timestamp: new Date(),
            });
          }

          // Update fix quality
          if (parsed.fixQuality !== undefined) {
            setFixType(parsed.fixQuality as FixType);
          }

          // Update satellite count and HDOP
          if (parsed.numSatellites !== undefined) {
            setNumSatellites(parsed.numSatellites);
          }

          if (parsed.hdop !== undefined) {
            setHdop(parsed.hdop);
          }
        }
      }
    }

    // Update satellites display
    setSatellites(nmeaParser.getSatellites());
  }, [nmeaBuffer, nmeaParser]);

  // Handle Bluetooth connection
  const handleBleConnect = async () => {
    try {
      await bluetoothService.connect();
      setBleConnected(true);

      bluetoothService.onData((data) => {
        processNmeaData(data);
      });
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      alert('Failed to connect to Bluetooth device. Make sure the device is paired and in range.');
    }
  };

  // Handle Bluetooth disconnection
  const handleBleDisconnect = async () => {
    try {
      await bluetoothService.disconnect();
      setBleConnected(false);
    } catch (error) {
      console.error('Bluetooth disconnection failed:', error);
    }
  };

  // Handle NTRIP connection
  const handleNtripConnect = async (config: NtripConfig) => {
    try {
      setShowNtripDialog(false);
      await ntripClient.connect(config);
      setNtripConnected(true);

      // Forward RTCM data to Bluetooth device
      ntripClient.onData(async (data) => {
        if (bluetoothService.isConnected()) {
          try {
            await bluetoothService.write(data);
          } catch (error) {
            console.error('Failed to forward RTCM data:', error);
          }
        }
      });
    } catch (error) {
      console.error('NTRIP connection failed:', error);
      alert('Failed to connect to NTRIP caster. Please check your configuration.');
    }
  };

  // Handle NTRIP disconnection
  const handleNtripDisconnect = () => {
    ntripClient.disconnect();
    setNtripConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bluetoothService.disconnect();
      ntripClient.disconnect();
    };
  }, [bluetoothService, ntripClient]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>NavX PWA</h1>
        <div className="header-buttons">
          <button
            onClick={bleConnected ? handleBleDisconnect : handleBleConnect}
            style={{ backgroundColor: bleConnected ? '#dc3545' : '#007bff' }}
          >
            {bleConnected ? 'Disconnect BLE' : 'Connect BLE'}
          </button>
          <button
            onClick={ntripConnected ? handleNtripDisconnect : () => setShowNtripDialog(true)}
            style={{ backgroundColor: ntripConnected ? '#dc3545' : '#007bff' }}
            disabled={!bleConnected}
          >
            {ntripConnected ? 'Disconnect NTRIP' : 'Connect NTRIP'}
          </button>
        </div>
      </header>

      <div className="content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Map
          </button>
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'map' && <MapView position={position} />}
          {activeTab === 'info' && (
            <InfoTab
              satellites={satellites}
              fixType={fixType}
              hdop={hdop}
              numSatellites={numSatellites}
            />
          )}
        </div>
      </div>

      <div className="status-bar">
        <div className="status-item">
          <div className={`status-indicator ${bleConnected ? 'connected' : ''}`} />
          <span>BLE: {bleConnected ? bluetoothService.getDeviceName() || 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="status-item">
          <div className={`status-indicator ${ntripConnected ? 'connected' : ''}`} />
          <span>NTRIP: {ntripConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {position && (
          <div className="status-item">
            <span>
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      <NtripDialog
        isOpen={showNtripDialog}
        onClose={() => setShowNtripDialog(false)}
        onConnect={handleNtripConnect}
      />
    </div>
  );
}

export default App;

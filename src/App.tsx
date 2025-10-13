import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { MapView } from './components/MapView';
import { InfoTab } from './components/InfoTab';
import { NtripDialog } from './components/NtripDialog';
import { BluetoothService } from './bluetooth-service';
import { NtripClient } from './ntrip-client';
import { NmeaParser } from './nmea-parser';
import { MountpointService } from './mountpoint-service';
import { GpsPosition, NtripConfig, AutoMountpointConfig, FixType, SatelliteInfo } from './types';

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
            const newPosition = {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              altitude: parsed.altitude,
              timestamp: new Date(),
            };
            setPosition(newPosition);

            // Envoyer la position au client NTRIP si connecté
            if (ntripClient.isConnected()) {
              ntripClient.updateGpsPosition(newPosition);
            }
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
    // Defensive check: ensure Web Bluetooth API exists before attempting to connect
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      console.error('Web Bluetooth API not available in this browser/context');
      alert('Web Bluetooth non disponible dans ce navigateur ou contexte. Utilisez Chrome sur Android et accédez à l\'application via HTTPS (ou utilisez ngrok)');
      return;
    }

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

      // Pour le mountpoint NEAR, s'assurer qu'on a une position GPS
      if (config.mountpoint.toUpperCase() === 'NEAR' && !position) {
        alert('Position GPS requise pour le mountpoint NEAR. Veuillez attendre que votre position soit détectée.');
        return;
      }

      // Définir la position initiale si disponible
      if (position) {
        ntripClient.setInitialPosition(position);
      }

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

      // Afficher un message informatif pour NEAR
      if (config.mountpoint.toUpperCase() === 'NEAR') {
        console.log('Connecté avec mountpoint NEAR - sélection automatique de la station la plus proche');
      }
    } catch (error) {
      console.error('NTRIP connection failed:', error);
      alert('Failed to connect to NTRIP caster. Please check your configuration.');
    }
  };

  // Handle automatic NTRIP connection
  const handleAutoNtripConnect = async (config: AutoMountpointConfig) => {
    try {
      if (!position) {
        alert('Position GPS non disponible pour la connexion automatique');
        return;
      }

      setShowNtripDialog(false);

      // Afficher un indicateur de chargement
      const loadingMessage = 'Recherche du meilleur mountpoint...';
      console.log(loadingMessage);

      // Récupérer le meilleur mountpoint automatiquement
      const bestMountpoint = await MountpointService.getAutoMountpoint(config, position);

      if (!bestMountpoint) {
        alert(`Aucun mountpoint trouvé dans un rayon de ${config.maxDistance || 50}km`);
        return;
      }

      // Créer la configuration NTRIP avec le mountpoint trouvé
      const ntripConfig: NtripConfig = {
        host: config.host,
        port: config.port,
        mountpoint: bestMountpoint.mountpoint,
        username: config.username,
        password: config.password,
        sendGpsToServer: config.sendGpsToServer,
        wsUrl: config.wsUrl,
      };

      // Se connecter avec le mountpoint automatique
      await handleNtripConnect(ntripConfig);

      // Afficher les détails du mountpoint sélectionné
      alert(
        `Connecté automatiquement au mountpoint: ${bestMountpoint.mountpoint}\n` +
        `Distance: ${bestMountpoint.distance?.toFixed(1)}km\n` +
        `Réseau: ${bestMountpoint.network}\n` +
        `Pays: ${bestMountpoint.country}`
      );

    } catch (error) {
      console.error('Auto NTRIP connection failed:', error);
      alert('Échec de la connexion automatique NTRIP. Veuillez essayer manuellement.');
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
            style={{
              backgroundColor: !bleConnected ? '#ccc' : (ntripConnected ? '#dc3545' : '#007bff'),
              cursor: !bleConnected ? 'not-allowed' : 'pointer'
            }}
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
          {activeTab === 'map' && <MapView position={position} fixType={fixType} />}
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
        onAutoConnect={handleAutoNtripConnect}
        position={position}
      />
    </div>
  );
}

export default App;

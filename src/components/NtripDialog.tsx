import React, { useState } from 'react';
import { NtripConfig, AutoMountpointConfig, GpsPosition } from '../types';
import './NtripDialog.css';

interface NtripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: NtripConfig) => void;
  onAutoConnect: (config: AutoMountpointConfig) => void;
  position: GpsPosition | null;
}

export const NtripDialog: React.FC<NtripDialogProps> = ({
  isOpen,
  onClose,
  onConnect,
  onAutoConnect,
  position
}) => {
  const [connectionMode, setConnectionMode] = useState<'manual' | 'auto'>('manual');
  const [host, setHost] = useState('crtk.net');
  const [port, setPort] = useState(2101);
  const [wsUrl, setWsUrl] = useState('');
  const [wsUrlTouched, setWsUrlTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Le proxy externe est maintenant utilisé par défaut - plus besoin de configuration WebSocket URL
  React.useEffect(() => {
    if (!wsUrlTouched) {
      // Laisser vide par défaut car on utilise maintenant le proxy externe automatiquement
      setWsUrl('');
    }
  }, [host, port, wsUrlTouched]);
  const [mountpoint, setMountpoint] = useState('NEAR');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [maxDistance, setMaxDistance] = useState(50);
  const [sendGpsToServer, setSendGpsToServer] = useState(true);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ host, port, mountpoint, username, password, sendGpsToServer });
  };

  const handleAutoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) {
      alert('Position GPS requise pour la connexion automatique');
      return;
    }
    onAutoConnect({ host, port, username, password, maxDistance, sendGpsToServer });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Configuration NTRIP</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="connection-mode-selector">
          <button
            type="button"
            className={`mode-button ${connectionMode === 'manual' ? 'active' : ''}`}
            onClick={() => setConnectionMode('manual')}
          >
            Manuel
          </button>
          <button
            type="button"
            className={`mode-button ${connectionMode === 'auto' ? 'active' : ''}`}
            onClick={() => setConnectionMode('auto')}
            disabled={!position}
            title={!position ? 'Position GPS requise' : ''}
          >
            Automatique
          </button>
        </div>

        {connectionMode === 'manual' ? (
          <form onSubmit={handleManualSubmit}>
            <div className="near-info">
              <p><strong>💡 Connexion directe :</strong> L'application se connecte automatiquement via le proxy externe. Utilisez le mountpoint "NEAR" pour sélectionner la station la plus proche.</p>
            </div>
            <div className="form-group">
              <label htmlFor="host">Hôte du Caster NTRIP</label>
              <input
                id="host"
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="crtk.net"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="port">Port</label>
              <input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="2101"
                required
              />
            </div>
            <div className="form-group">
              <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Masquer options avancées' : 'Afficher options avancées'}
              </button>
              {showAdvanced && (
                <>
                  <label htmlFor="ws-url">Proxy WebSocket alternatif (optionnel)</label>
                  <input
                    id="ws-url"
                    type="text"
                    value={wsUrl}
                    onChange={(e) => { setWsUrl(e.target.value); setWsUrlTouched(true); }}
                    onFocus={() => setWsUrlTouched(true)}
                    placeholder="Par défaut: wss://ws-tcp-ntrip-client.natuition.com"
                  />
                  <small>Laisser vide pour utiliser le proxy externe par défaut</small>
                </>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="mountpoint">Mountpoint</label>
              <input
                id="mountpoint"
                type="text"
                value={mountpoint}
                onChange={(e) => {
                  setMountpoint(e.target.value);
                  // Si l'utilisateur tape NEAR, activer automatiquement l'envoi GPS
                  if (e.target.value.toUpperCase() === 'NEAR') {
                    setSendGpsToServer(true);
                  }
                }}
                placeholder="NEAR"
                required
              />
              <small>Utilisez "NEAR" pour la sélection automatique de la station la plus proche</small>
            </div>
            <div className="form-group">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="form-group">
              <div className="switch-group">
                <label htmlFor="send-gps">Envoyer position GPS au caster</label>
                <div className="switch">
                  <input
                    id="send-gps"
                    type="checkbox"
                    checked={sendGpsToServer}
                    onChange={(e) => setSendGpsToServer(e.target.checked)}
                    disabled={mountpoint.toUpperCase() === 'NEAR'}
                  />
                  <span className="slider"></span>
                </div>
              </div>
              <small>
                {mountpoint.toUpperCase() === 'NEAR'
                  ? 'Requis pour NEAR - envoie automatiquement la position pour sélectionner la station la plus proche'
                  : 'Envoie périodiquement la position GPS au caster NTRIP pour optimiser les corrections'}
              </small>
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={onClose}>Annuler</button>
              <button type="submit">Se connecter</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAutoSubmit}>
            <div className="auto-info">
              <p>Connexion automatique basée sur votre position GPS actuelle :</p>
              {position && (
                <p className="position-info">
                  📍 {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="auto-host">Hôte du Caster NTRIP</label>
              <input
                id="auto-host"
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="crtk.net"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="auto-port">Port</label>
              <input
                id="auto-port"
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="2101"
                required
              />
            </div>
            <div className="form-group">
              <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Masquer options avancées' : 'Afficher options avancées'}
              </button>
              {showAdvanced && (
                <>
                  <label htmlFor="auto-ws-url">Proxy WebSocket alternatif (optionnel)</label>
                  <input
                    id="auto-ws-url"
                    type="text"
                    value={wsUrl}
                    onChange={(e) => { setWsUrl(e.target.value); setWsUrlTouched(true); }}
                    onFocus={() => setWsUrlTouched(true)}
                    placeholder="Par défaut: wss://ws-tcp-ntrip-client.natuition.com"
                  />
                  <small>Laisser vide pour utiliser le proxy externe par défaut</small>
                </>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="auto-username">Nom d'utilisateur</label>
              <input
                id="auto-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="form-group">
              <label htmlFor="auto-password">Mot de passe</label>
              <input
                id="auto-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="form-group">
              <label htmlFor="max-distance">Distance maximale (km)</label>
              <input
                id="max-distance"
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                min="1"
                max="200"
                placeholder="50"
              />
              <small>Recherche des mountpoints dans un rayon de {maxDistance}km</small>
            </div>
            <div className="form-group">
              <div className="switch-group">
                <label htmlFor="auto-send-gps">Envoyer position GPS au caster</label>
                <div className="switch">
                  <input
                    id="auto-send-gps"
                    type="checkbox"
                    checked={sendGpsToServer}
                    onChange={(e) => setSendGpsToServer(e.target.checked)}
                  />
                  <span className="slider"></span>
                </div>
              </div>
              <small>Envoie périodiquement la position GPS au caster NTRIP pour optimiser les corrections</small>
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={onClose}>Annuler</button>
              <button type="submit">Connexion automatique</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

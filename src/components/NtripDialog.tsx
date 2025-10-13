import React, { useState } from 'react';
import { NtripConfig } from '../types';
import './NtripDialog.css';

interface NtripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: NtripConfig) => void;
}

export const NtripDialog: React.FC<NtripDialogProps> = ({ isOpen, onClose, onConnect }) => {
  const [host, setHost] = useState('rtk2go.com');
  const [port, setPort] = useState(2101);
  const [mountpoint, setMountpoint] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ host, port, mountpoint, username, password });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>NTRIP Configuration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="host">NTRIP Caster Host</label>
            <input
              id="host"
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="rtk2go.com"
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
            <label htmlFor="mountpoint">Mountpoint</label>
            <input
              id="mountpoint"
              type="text"
              value={mountpoint}
              onChange={(e) => setMountpoint(e.target.value)}
              placeholder="RTCM3EPH"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Connect</button>
          </div>
        </form>
      </div>
    </div>
  );
};

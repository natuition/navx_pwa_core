import React from 'react';
import { SatelliteInfo, FixType, getFixTypeName } from '../types';
import './InfoTab.css';

interface InfoTabProps {
  satellites: SatelliteInfo[];
  fixType: FixType;
  hdop?: number;
  numSatellites?: number;
}

export const InfoTab: React.FC<InfoTabProps> = ({ satellites, fixType, hdop, numSatellites }) => {
  return (
    <div className="info-tab">
      <div className="info-section">
        <h3>Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Fix Type:</span>
            <span className={`info-value fix-${fixType}`}>{getFixTypeName(fixType)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Satellites:</span>
            <span className="info-value">{numSatellites ?? 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">HDOP:</span>
            <span className="info-value">{hdop?.toFixed(2) ?? 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h3>Sky View</h3>
        <SkyView satellites={satellites} />
      </div>

      <div className="info-section">
        <h3>Satellite Details</h3>
        <SatelliteTable satellites={satellites} />
      </div>
    </div>
  );
};

const SkyView: React.FC<{ satellites: SatelliteInfo[] }> = ({ satellites }) => {
  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 20;

  const polarToCartesian = (elevation: number, azimuth: number) => {
    // Convert elevation to distance from center (0° = edge, 90° = center)
    const distance = radius * (1 - elevation / 90);
    // Convert azimuth to angle (0° = North = top)
    const angle = (azimuth - 90) * (Math.PI / 180);

    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  return (
    <div className="sky-view">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle cx={center} cy={center} r={radius} fill="#f0f0f0" stroke="#ccc" strokeWidth="2" />
        
        {/* Elevation circles */}
        <circle cx={center} cy={center} r={radius * 2/3} fill="none" stroke="#ddd" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 1/3} fill="none" stroke="#ddd" strokeWidth="1" />
        
        {/* Cardinal directions */}
        <text x={center} y={15} textAnchor="middle" fontSize="12" fill="#666">N</text>
        <text x={size - 10} y={center + 5} textAnchor="end" fontSize="12" fill="#666">E</text>
        <text x={center} y={size - 5} textAnchor="middle" fontSize="12" fill="#666">S</text>
        <text x={10} y={center + 5} textAnchor="start" fontSize="12" fill="#666">W</text>

        {/* Satellites */}
        {satellites.map((sat) => {
          const pos = polarToCartesian(sat.elevation, sat.azimuth);
          const color = sat.used ? (sat.snr > 30 ? '#28a745' : '#ffc107') : '#ccc';
          
          return (
            <g key={sat.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={6}
                fill={color}
                stroke="#333"
                strokeWidth="1"
              />
              <text
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                {sat.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const SatelliteTable: React.FC<{ satellites: SatelliteInfo[] }> = ({ satellites }) => {
  if (satellites.length === 0) {
    return <div className="no-satellites">No satellite data available</div>;
  }

  return (
    <div className="satellite-table-container">
      <table className="satellite-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Elevation</th>
            <th>Azimuth</th>
            <th>SNR</th>
            <th>Used</th>
          </tr>
        </thead>
        <tbody>
          {satellites.map((sat) => (
            <tr key={sat.id} className={sat.used ? 'used' : ''}>
              <td>{sat.id}</td>
              <td>{sat.elevation}°</td>
              <td>{sat.azimuth}°</td>
              <td>
                <div className="snr-bar-container">
                  <div 
                    className="snr-bar" 
                    style={{ 
                      width: `${Math.min(100, (sat.snr / 50) * 100)}%`,
                      backgroundColor: sat.snr > 30 ? '#28a745' : sat.snr > 20 ? '#ffc107' : '#dc3545'
                    }}
                  />
                  <span className="snr-value">{sat.snr}</span>
                </div>
              </td>
              <td>{sat.used ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

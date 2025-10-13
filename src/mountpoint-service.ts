import { MountpointInfo, AutoMountpointConfig, GpsPosition } from './types';

/**
 * Service pour récupérer automatiquement les mountpoints NTRIP basés sur la position GPS
 */
export class MountpointService {
    /**
     * Calcule la distance entre deux points GPS en kilomètres
     */
    private static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static toRadians(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    /**
     * Parse une ligne de sourcetable NTRIP
     */
    private static parseMountpointLine(line: string): MountpointInfo | null {
        const parts = line.split(';');
        if (parts.length < 18 || parts[0] !== 'STR') {
            return null;
        }

        try {
            return {
                mountpoint: parts[1],
                identifier: parts[2],
                format: parts[3],
                formatDetails: parts[4],
                carrier: parseInt(parts[5]) || 0,
                navSystem: parts[6],
                network: parts[7],
                country: parts[8],
                latitude: parseFloat(parts[9]) || 0,
                longitude: parseFloat(parts[10]) || 0,
                nmea: parts[11] === '1',
                solution: parseInt(parts[12]) || 0,
                generator: parts[13],
                compressionEncryption: parts[14],
                authentication: parts[15],
                fee: parts[16] === 'Y',
                bitrate: parseInt(parts[17]) || 0,
                misc: parts[18] || '',
            };
        } catch (error) {
            console.warn('Erreur lors du parsing de la ligne mountpoint:', line, error);
            return null;
        }
    }

    /**
     * Récupère la liste des mountpoints depuis un caster NTRIP
     */
    static async getMountpoints(config: AutoMountpointConfig): Promise<MountpointInfo[]> {
        return new Promise((resolve, reject) => {
            try {
                // Utiliser le proxy WebSocket externe pour récupérer la sourcetable
                const wsUrl = `wss://ws-tcp-ntrip-client.natuition.com/?host=${encodeURIComponent(config.host)}&port=${encodeURIComponent(config.port.toString())}`;
                const socket = new WebSocket(wsUrl); socket.onopen = () => {
                    // Envoyer la requête pour la sourcetable
                    const auth = btoa(`${config.username}:${config.password}`);
                    const request = [
                        'GET / HTTP/1.1',
                        `Host: ${config.host}:${config.port}`,
                        `Authorization: Basic ${auth}`,
                        'User-Agent: NTRIP NavX-PWA/1.0',
                        'Accept: */*',
                        'Connection: close',
                        '',
                        ''
                    ].join('\r\n');

                    socket.send(new TextEncoder().encode(request));
                };

                socket.onmessage = (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        const response = new TextDecoder().decode(event.data);
                        const mountpoints = this.parseSourceTable(response);
                        socket.close();
                        resolve(mountpoints);
                    }
                };

                socket.onerror = (error) => {
                    console.error('Erreur WebSocket lors de la récupération des mountpoints:', error);
                    socket.close();
                    reject(new Error('Impossible de récupérer la liste des mountpoints'));
                };

                socket.onclose = () => {
                    // Si la connexion se ferme sans données, on reject
                    reject(new Error('Connexion fermée sans données'));
                };

                // Timeout après 10 secondes
                setTimeout(() => {
                    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
                        socket.close();
                        reject(new Error('Timeout lors de la récupération des mountpoints'));
                    }
                }, 10000);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Parse la sourcetable NTRIP pour extraire les mountpoints
     */
    private static parseSourceTable(response: string): MountpointInfo[] {
        const lines = response.split('\n');
        const mountpoints: MountpointInfo[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('STR;')) {
                const mountpoint = this.parseMountpointLine(trimmedLine);
                if (mountpoint) {
                    mountpoints.push(mountpoint);
                }
            }
        }

        return mountpoints;
    }

    /**
     * Trouve les mountpoints les plus proches de la position donnée
     */
    static findNearestMountpoints(
        mountpoints: MountpointInfo[],
        position: GpsPosition,
        maxDistance: number = 50,
        maxResults: number = 5
    ): MountpointInfo[] {
        // Calculer la distance pour chaque mountpoint
        const mountpointsWithDistance = mountpoints.map(mp => ({
            ...mp,
            distance: this.calculateDistance(
                position.latitude,
                position.longitude,
                mp.latitude,
                mp.longitude
            )
        }));

        // Filtrer par distance maximale et trier par distance
        const nearestMountpoints = mountpointsWithDistance
            .filter(mp => mp.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxResults);

        return nearestMountpoints;
    }

    /**
     * Sélectionne automatiquement le meilleur mountpoint basé sur la position
     */
    static selectBestMountpoint(
        mountpoints: MountpointInfo[],
        position: GpsPosition,
        maxDistance: number = 50
    ): MountpointInfo | null {
        const nearest = this.findNearestMountpoints(mountpoints, position, maxDistance, 1);

        if (nearest.length === 0) {
            return null;
        }

        // Pour l'instant, on prend simplement le plus proche
        // On pourrait ajouter d'autres critères comme :
        // - Le type de signal (RTK vs DGPS)
        // - La qualité du signal
        // - La compatibilité avec le récepteur
        return nearest[0];
    }

    /**
     * Récupère automatiquement le meilleur mountpoint pour une position donnée
     */
    static async getAutoMountpoint(
        config: AutoMountpointConfig,
        position: GpsPosition
    ): Promise<MountpointInfo | null> {
        try {
            console.log(`Recherche du mountpoint optimal pour la position: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);

            const mountpoints = await this.getMountpoints(config);
            console.log(`${mountpoints.length} mountpoints trouvés`);

            const bestMountpoint = this.selectBestMountpoint(
                mountpoints,
                position,
                config.maxDistance || 50
            );

            if (bestMountpoint) {
                console.log(`Mountpoint sélectionné: ${bestMountpoint.mountpoint} (distance: ${bestMountpoint.distance?.toFixed(1)}km)`);
            } else {
                console.log('Aucun mountpoint trouvé dans la zone');
            }

            return bestMountpoint;
        } catch (error) {
            console.error('Erreur lors de la récupération automatique du mountpoint:', error);
            return null;
        }
    }
}
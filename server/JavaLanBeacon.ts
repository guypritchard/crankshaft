import dgram from 'dgram';

/**
 * Broadcasts a LAN beacon that mimics the vanilla "Open to LAN" announcement
 * so Java clients scanning for local games can discover the dedicated server.
 */
export class JavaLanBeacon {
    private socket: dgram.Socket | null = null;
    private interval: NodeJS.Timer | null = null;

    public start(motd: string, port: number): void {
        this.stop();

        const message = Buffer.from(`[MOTD]${motd}[/MOTD][AD]${port}[/AD]`);
        this.socket = dgram.createSocket('udp4');

        this.interval = setInterval(() => {
            if (!this.socket) {
                return;
            }

            this.socket.send(message, 0, message.length, 4445, '224.0.2.60', (error) => {
                if (error) {
                    // Non-fatal; just log and continue.
                    console.error('LAN beacon send error', error);
                }
            });
        }, 1500);
    }

    public stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.socket) {
            try {
                this.socket.close();
            } catch {
                // ignore close errors
            }
            this.socket = null;
        }
    }
}

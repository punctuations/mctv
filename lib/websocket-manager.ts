type WebSocketClient = {
    id: string;
    send: (data: string) => void;
    close: () => void;
};

class WebSocketManager {
    private clients: Set<WebSocketClient> = new Set();
    private messageListeners: Set<(message: any) => void> = new Set();
    private onListenerCountChange?: (count: number) => void;

    addClient(client: WebSocketClient) {
        this.clients.add(client);
        console.log(
            `[mctv] WebSocket client connected. Total clients: ${this.clients.size}`,
        );
    }

    removeClient(client: WebSocketClient) {
        this.clients.delete(client);
        console.log(
            `[mctv] WebSocket client disconnected. Total clients: ${this.clients.size}`,
        );
    }

    broadcast(message: any) {
        const data = JSON.stringify(message);
        const deadClients: WebSocketClient[] = [];

        this.clients.forEach((client) => {
            try {
                client.send(data);
            } catch (error) {
                console.error(
                    "[mctv] Error sending to WebSocket client:",
                    error,
                );
                deadClients.push(client);
            }
        });

        // Clean up dead clients
        deadClients.forEach((client) => this.removeClient(client));
    }

    setListenerCountChangeCallback(callback: (count: number) => void) {
        this.onListenerCountChange = callback;
    }

    onNewMessage(callback: (message: any) => void) {
        console.log(
            "[mctv] [WebSocketManager] New message listener registered. Total listeners:",
            this.messageListeners.size + 1,
        );
        this.messageListeners.add(callback);

        if (this.onListenerCountChange) {
            this.onListenerCountChange(this.messageListeners.size);
        }

        return () => {
            console.log(
                "[mctv] [WebSocketManager] Message listener unregistered",
            );
            this.messageListeners.delete(callback);

            if (this.onListenerCountChange) {
                this.onListenerCountChange(this.messageListeners.size);
            }
        };
    }

    notifyNewMessage(message: any) {
        console.log(
            "[mctv] [WebSocketManager] Notifying new message to",
            this.messageListeners.size,
            "listeners and",
            this.clients.size,
            "WebSocket clients",
        );

        // Broadcast to WebSocket clients (if any)
        this.broadcast({ type: "new-message", message });

        // Notify SSE listeners
        this.messageListeners.forEach((listener) => {
            try {
                listener(message);
            } catch (error) {
                console.error(
                    "[mctv] [WebSocketManager] Error notifying listener:",
                    error,
                );
            }
        });
    }

    getClientCount(): number {
        return this.clients.size;
    }

    getListenerCount(): number {
        return this.messageListeners.size;
    }
}
// Ensure a single instance across module reloads (Next.js dev/HMR) and routes
const globalForWS = globalThis as unknown as { wsManager?: WebSocketManager };
export const wsManager = globalForWS.wsManager ??
    (globalForWS.wsManager = new WebSocketManager());

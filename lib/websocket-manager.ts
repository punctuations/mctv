type WebSocketClient = {
    id: string;
    send: (data: string) => void;
    close: () => void;
};

class WebSocketManager {
    private clients: Set<WebSocketClient> = new Set();
    private messageListeners: Set<(message: any) => void> = new Set();

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

    // For chat manager to notify about new messages
    onNewMessage(callback: (message: any) => void) {
        this.messageListeners.add(callback);
        return () => this.messageListeners.delete(callback);
    }

    notifyNewMessage(message: any) {
        this.broadcast({ type: "new-message", message });
    }

    getClientCount(): number {
        return this.clients.size;
    }
}

export const wsManager = new WebSocketManager();

/**
 * MQTT Client for Escape Room Admin Panel
 * Connects to HiveMQ Cloud via WebSocket
 */

// Configuration - MODIFY THESE VALUES
const MQTT_CONFIG = {
    // HiveMQ Cloud WebSocket URL
    host: 'your-cluster.hivemq.cloud',
    port: 8884,  // WebSocket TLS port
    
    // Credentials
    username: 'escape_device',
    password: 'your_password',
    
    // Client settings
    clientId: 'AdminPanel_' + Math.random().toString(16).substr(2, 8),
    useSSL: true,
    
    // Reconnect settings
    reconnectTimeout: 5000,
    keepAliveInterval: 60
};

class MQTTClient {
    constructor() {
        this.client = null;
        this.connected = false;
        this.messageHandlers = [];
        this.reconnectTimer = null;
        this.messageCount = 0;
        
        // Device status tracking
        this.devices = {
            'esterno': { status: 'offline', lastSeen: null, heartbeat: null },
            'soggiorno': { status: 'offline', lastSeen: null, heartbeat: null },
            'bagno': { status: 'offline', lastSeen: null, heartbeat: null },
            'cucina': { status: 'offline', lastSeen: null, heartbeat: null }
        };
        
        this.activeSession = 999;
    }
    
    /**
     * Connect to MQTT broker
     */
    connect() {
        console.log('[MQTT] Connecting to HiveMQ Cloud...');
        this.addLog('system', '🔌 Connecting to MQTT broker...');
        
        // Create Paho MQTT client
        this.client = new Paho.MQTT.Client(
            MQTT_CONFIG.host,
            MQTT_CONFIG.port,
            MQTT_CONFIG.clientId
        );
        
        // Set up callbacks
        this.client.onConnectionLost = this.onConnectionLost.bind(this);
        this.client.onMessageArrived = this.onMessageArrived.bind(this);
        
        // Connection options
        const connectOptions = {
            useSSL: MQTT_CONFIG.useSSL,
            userName: MQTT_CONFIG.username,
            password: MQTT_CONFIG.password,
            keepAliveInterval: MQTT_CONFIG.keepAliveInterval,
            onSuccess: this.onConnect.bind(this),
            onFailure: this.onConnectFailure.bind(this),
            reconnect: false  // Manual reconnect for better control
        };
        
        try {
            this.client.connect(connectOptions);
        } catch (error) {
            console.error('[MQTT] Connection error:', error);
            this.addLog('error', `❌ Connection error: ${error.message}`);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Connection successful
     */
    onConnect() {
        console.log('[MQTT] Connected successfully!');
        this.connected = true;
        this.updateConnectionStatus(true);
        this.addLog('system', '✅ MQTT Connected!');
        
        // Subscribe to all device topics
        this.subscribeToTopics();
        
        // Clear any pending reconnect
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    
    /**
     * Connection failed
     */
    onConnectFailure(error) {
        console.error('[MQTT] Connection failed:', error);
        this.connected = false;
        this.updateConnectionStatus(false);
        this.addLog('error', `❌ Connection failed: ${error.errorMessage || 'Unknown error'}`);
        this.scheduleReconnect();
    }
    
    /**
     * Connection lost
     */
    onConnectionLost(response) {
        console.warn('[MQTT] Connection lost:', response);
        this.connected = false;
        this.updateConnectionStatus(false);
        
        if (response.errorCode !== 0) {
            this.addLog('error', `⚠️ Connection lost: ${response.errorMessage}`);
        }
        
        this.scheduleReconnect();
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return;  // Already scheduled
        
        console.log(`[MQTT] Reconnecting in ${MQTT_CONFIG.reconnectTimeout}ms...`);
        this.addLog('system', `🔄 Reconnecting in ${MQTT_CONFIG.reconnectTimeout/1000}s...`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, MQTT_CONFIG.reconnectTimeout);
    }
    
    /**
     * Subscribe to device topics
     */
    subscribeToTopics() {
        const topics = [
            'device/+/heartbeat',        // All device heartbeats
            'device/+/status',           // All device status (LWT)
            'escape/+/+/#'               // All escape room topics
        ];
        
        topics.forEach(topic => {
            this.client.subscribe(topic);
            console.log(`[MQTT] Subscribed to: ${topic}`);
        });
        
        this.addLog('system', `📥 Subscribed to ${topics.length} topic patterns`);
    }
    
    /**
     * Message arrived callback
     */
    onMessageArrived(message) {
        const topic = message.destinationName;
        const payload = message.payloadString;
        
        this.messageCount++;
        this.updateMessageCount();
        
        // Parse topic
        const topicParts = topic.split('/');
        
        // Handle different message types
        if (topic.startsWith('device/') && topic.endsWith('/heartbeat')) {
            this.handleHeartbeat(topicParts[1], payload);
        } else if (topic.startsWith('device/') && topic.endsWith('/status')) {
            this.handleStatus(topicParts[1], payload);
        } else {
            this.handleEscapeTopic(topic, payload);
        }
        
        // Call custom handlers
        this.messageHandlers.forEach(handler => {
            try {
                handler(topic, payload);
            } catch (error) {
                console.error('[MQTT] Handler error:', error);
            }
        });
    }
    
    /**
     * Handle heartbeat message
     */
    handleHeartbeat(deviceId, payload) {
        try {
            const data = JSON.parse(payload);
            
            if (this.devices[deviceId]) {
                this.devices[deviceId].status = 'online';
                this.devices[deviceId].lastSeen = new Date();
                this.devices[deviceId].heartbeat = data;
                
                // Update UI
                if (window.DeviceManager) {
                    window.DeviceManager.updateDeviceStatus(deviceId, 'online', data);
                }
            }
            
            this.addLog('heartbeat', `💓 ${deviceId}: uptime=${data.uptime_s}s, rssi=${data.wifi_rssi}dBm`);
        } catch (error) {
            console.error('[MQTT] Heartbeat parse error:', error);
        }
    }
    
    /**
     * Handle status message (LWT)
     */
    handleStatus(deviceId, payload) {
        const status = payload;  // "online" or "offline"
        
        if (this.devices[deviceId]) {
            this.devices[deviceId].status = status;
            
            if (status === 'online') {
                this.devices[deviceId].lastSeen = new Date();
            }
            
            // Update UI
            if (window.DeviceManager) {
                window.DeviceManager.updateDeviceStatus(deviceId, status, null);
            }
        }
        
        const emoji = status === 'online' ? '✅' : '❌';
        this.addLog('status', `${emoji} ${deviceId}: ${status.toUpperCase()}`);
    }
    
    /**
     * Handle escape room topics
     */
    handleEscapeTopic(topic, payload) {
        // Extract room and event
        const parts = topic.split('/');
        if (parts.length >= 3) {
            const room = parts[1];
            const sessionId = parts[2];
            const event = parts.slice(3).join('/');
            
            this.addLog('trigger', `🎯 ${room}/${sessionId}/${event}: ${payload}`);
        }
    }
    
    /**
     * Publish message
     */
    publish(topic, payload, qos = 0, retained = false) {
        if (!this.connected) {
            console.warn('[MQTT] Cannot publish - not connected');
            this.addLog('error', '❌ Cannot publish - MQTT not connected');
            return false;
        }
        
        try {
            const message = new Paho.MQTT.Message(payload);
            message.destinationName = topic;
            message.qos = qos;
            message.retained = retained;
            
            this.client.send(message);
            
            console.log(`[MQTT] Published to ${topic}:`, payload);
            this.addLog('command', `📤 ${topic}: ${payload}`);
            
            return true;
        } catch (error) {
            console.error('[MQTT] Publish error:', error);
            this.addLog('error', `❌ Publish error: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Send remote reset command
     */
    resetDevice(deviceId) {
        const topic = `device/${deviceId}/cmd/reset`;
        return this.publish(topic, 'true');
    }
    
    /**
     * Assign new session ID to all devices
     */
    assignSessionId(sessionId) {
        const topic = 'device/+/cmd/assign_session';
        const payload = JSON.stringify({ session_id: sessionId });
        
        // Publish to each device individually
        const devices = ['esterno', 'soggiorno', 'bagno', 'cucina'];
        let success = true;
        
        devices.forEach(deviceId => {
            const deviceTopic = `device/${deviceId}/cmd/assign_session`;
            if (!this.publish(deviceTopic, payload)) {
                success = false;
            }
        });
        
        if (success) {
            this.activeSession = sessionId;
        }
        
        return success;
    }
    
    /**
     * Test LED (example command)
     */
    testLED(deviceId) {
        const topic = `escape/${deviceId}/${this.activeSession}/led/test`;
        return this.publish(topic, 'blink');
    }
    
    /**
     * Add message handler
     */
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    
    /**
     * Update connection status UI
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('mqtt-status');
        if (!statusEl) return;
        
        if (connected) {
            statusEl.innerHTML = `
                <div class="w-3 h-3 rounded-full bg-green-500 status-online"></div>
                <span class="text-sm">MQTT Connected</span>
            `;
        } else {
            statusEl.innerHTML = `
                <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span class="text-sm">MQTT Disconnected</span>
            `;
        }
    }
    
    /**
     * Update message counter
     */
    updateMessageCount() {
        const el = document.getElementById('stat-messages');
        if (el) {
            el.textContent = this.messageCount;
        }
    }
    
    /**
     * Add log entry to UI
     */
    addLog(type, message) {
        const logsEl = document.getElementById('mqtt-logs');
        if (!logsEl) return;
        
        // Remove "waiting" message if exists
        if (logsEl.children.length === 1 && logsEl.children[0].classList.contains('text-gray-500')) {
            logsEl.innerHTML = '';
        }
        
        const timestamp = new Date().toLocaleTimeString('it-IT');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logsEl.appendChild(logEntry);
        
        // Auto-scroll to bottom
        logsEl.scrollTop = logsEl.scrollHeight;
        
        // Keep max 500 logs
        while (logsEl.children.length > 500) {
            logsEl.removeChild(logsEl.firstChild);
        }
    }
    
    /**
     * Clear logs
     */
    clearLogs() {
        const logsEl = document.getElementById('mqtt-logs');
        if (logsEl) {
            logsEl.innerHTML = '<div class="text-gray-500">Logs cleared.</div>';
        }
    }
    
    /**
     * Disconnect
     */
    disconnect() {
        if (this.client && this.connected) {
            this.client.disconnect();
            this.connected = false;
            this.updateConnectionStatus(false);
            this.addLog('system', '🔌 Disconnected');
        }
    }
}

// Create global instance
window.mqttClient = new MQTTClient();
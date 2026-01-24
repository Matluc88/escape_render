/**
 * Device Management Module
 * Handles device status updates and control
 */

class DeviceManager {
    constructor() {
        this.devices = ['esterno', 'soggiorno', 'bagno', 'cucina'];
        this.deviceData = {};
        
        // Initialize device data
        this.devices.forEach(deviceId => {
            this.deviceData[deviceId] = {
                status: 'offline',
                lastSeen: null,
                uptime: 0,
                rssi: null,
                freeHeap: null
            };
        });
    }
    
    /**
     * Update device status from heartbeat/status messages
     */
    updateDeviceStatus(deviceId, status, heartbeatData = null) {
        if (!this.deviceData[deviceId]) return;
        
        this.deviceData[deviceId].status = status;
        this.deviceData[deviceId].lastSeen = new Date();
        
        if (heartbeatData) {
            this.deviceData[deviceId].uptime = heartbeatData.uptime_s || 0;
            this.deviceData[deviceId].rssi = heartbeatData.wifi_rssi || null;
            this.deviceData[deviceId].freeHeap = heartbeatData.free_heap || null;
        }
        
        // Update UI
        this.updateDeviceCard(deviceId);
        this.updateStatistics();
    }
    
    /**
     * Update individual device card
     */
    updateDeviceCard(deviceId) {
        const cardEl = document.getElementById(`device-${deviceId}`);
        if (!cardEl) return;
        
        const data = this.deviceData[deviceId];
        
        // Update status badge
        const statusBadge = cardEl.querySelector('.device-status span');
        if (statusBadge) {
            if (data.status === 'online') {
                statusBadge.className = 'px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs font-semibold';
                statusBadge.textContent = 'ONLINE';
            } else {
                statusBadge.className = 'px-3 py-1 bg-red-900 text-red-300 rounded-full text-xs font-semibold';
                statusBadge.textContent = 'OFFLINE';
            }
        }
        
        // Update uptime
        const uptimeEl = cardEl.querySelector('.device-uptime');
        if (uptimeEl) {
            uptimeEl.textContent = data.uptime > 0 ? this.formatUptime(data.uptime) : '-';
        }
        
        // Update RSSI
        const rssiEl = cardEl.querySelector('.device-rssi');
        if (rssiEl) {
            if (data.rssi !== null) {
                const rssiQuality = this.getRSSIQuality(data.rssi);
                rssiEl.innerHTML = `<span class="${rssiQuality.color}">${data.rssi} dBm</span>`;
            } else {
                rssiEl.textContent = '-';
            }
        }
        
        // Update free heap
        const heapEl = cardEl.querySelector('.device-heap');
        if (heapEl) {
            if (data.freeHeap !== null) {
                heapEl.textContent = this.formatBytes(data.freeHeap);
            } else {
                heapEl.textContent = '-';
            }
        }
        
        // Update last seen
        const lastSeenEl = cardEl.querySelector('.device-last-seen');
        if (lastSeenEl) {
            if (data.lastSeen) {
                const elapsed = this.getTimeElapsed(data.lastSeen);
                lastSeenEl.textContent = `Last seen: ${elapsed}`;
            } else {
                lastSeenEl.textContent = 'Last seen: Never';
            }
        }
    }
    
    /**
     * Update global statistics
     */
    updateStatistics() {
        let onlineCount = 0;
        let offlineCount = 0;
        
        this.devices.forEach(deviceId => {
            if (this.deviceData[deviceId].status === 'online') {
                onlineCount++;
            } else {
                offlineCount++;
            }
        });
        
        // Update UI
        const onlineEl = document.getElementById('stat-online');
        const offlineEl = document.getElementById('stat-offline');
        
        if (onlineEl) onlineEl.textContent = onlineCount;
        if (offlineEl) offlineEl.textContent = offlineCount;
    }
    
    /**
     * Format uptime seconds to human readable
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${bytes} B`;
        }
    }
    
    /**
     * Get RSSI quality indicator
     */
    getRSSIQuality(rssi) {
        if (rssi >= -50) {
            return { quality: 'excellent', color: 'text-green-400' };
        } else if (rssi >= -60) {
            return { quality: 'good', color: 'text-green-500' };
        } else if (rssi >= -70) {
            return { quality: 'fair', color: 'text-yellow-500' };
        } else {
            return { quality: 'poor', color: 'text-red-500' };
        }
    }
    
    /**
     * Get time elapsed since last seen
     */
    getTimeElapsed(date) {
        const now = new Date();
        const elapsed = Math.floor((now - date) / 1000);
        
        if (elapsed < 60) {
            return `${elapsed}s ago`;
        } else if (elapsed < 3600) {
            return `${Math.floor(elapsed / 60)}m ago`;
        } else if (elapsed < 86400) {
            return `${Math.floor(elapsed / 3600)}h ago`;
        } else {
            return `${Math.floor(elapsed / 86400)}d ago`;
        }
    }
    
    /**
     * Reset device via MQTT
     */
    resetDevice(deviceId) {
        if (!window.mqttClient || !window.mqttClient.connected) {
            this.showToast('error', 'MQTT not connected!');
            return;
        }
        
        // Confirm action
        if (!confirm(`Reset device "${deviceId}"? It will restart immediately.`)) {
            return;
        }
        
        const success = window.mqttClient.resetDevice(deviceId);
        
        if (success) {
            this.showToast('success', `Reset command sent to ${deviceId}`);
        } else {
            this.showToast('error', `Failed to send reset command to ${deviceId}`);
        }
    }
    
    /**
     * Test LED on device
     */
    testLED(deviceId) {
        if (!window.mqttClient || !window.mqttClient.connected) {
            this.showToast('error', 'MQTT not connected!');
            return;
        }
        
        const success = window.mqttClient.testLED(deviceId);
        
        if (success) {
            this.showToast('info', `LED test command sent to ${deviceId}`);
        } else {
            this.showToast('error', `Failed to send test command to ${deviceId}`);
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(type, message) {
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            info: 'bg-blue-600',
            warning: 'bg-yellow-600'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg`;
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    /**
     * Setup event listeners for device cards
     */
    setupEventListeners() {
        this.devices.forEach(deviceId => {
            const cardEl = document.getElementById(`device-${deviceId}`);
            if (!cardEl) return;
            
            // Reset button
            const resetBtn = cardEl.querySelector('.device-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetDevice(deviceId);
                });
            }
            
            // Test button
            const testBtn = cardEl.querySelector('.device-test-btn');
            if (testBtn) {
                testBtn.addEventListener('click', () => {
                    this.testLED(deviceId);
                });
            }
        });
    }
    
    /**
     * Start periodic UI updates
     */
    startPeriodicUpdates() {
        // Update "last seen" timestamps every 5 seconds
        setInterval(() => {
            this.devices.forEach(deviceId => {
                this.updateDeviceCard(deviceId);
            });
        }, 5000);
    }
}

// Create global instance
window.DeviceManager = new DeviceManager();
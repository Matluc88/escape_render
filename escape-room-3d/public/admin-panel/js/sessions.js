/**
 * Session Management Module
 * Handles session creation, stop, and ID assignment
 */

class SessionManager {
    constructor() {
        this.currentSession = 999;  // Default session ID
    }
    
    /**
     * Create new session and assign ID to all devices
     */
    createSession(sessionId) {
        if (!window.mqttClient || !window.mqttClient.connected) {
            this.showToast('error', 'MQTT not connected! Cannot create session.');
            return false;
        }
        
        // Validate session ID
        if (!sessionId || sessionId <= 0) {
            this.showToast('error', 'Invalid session ID. Must be greater than 0.');
            return false;
        }
        
        // Confirm action
        if (!confirm(`Start new session with ID ${sessionId}?\n\nAll devices will update their session ID.`)) {
            return false;
        }
        
        // Send assign_session command via MQTT
        const success = window.mqttClient.assignSessionId(sessionId);
        
        if (success) {
            this.currentSession = sessionId;
            this.updateSessionUI(sessionId);
            this.showToast('success', `Session ${sessionId} started! Commands sent to all devices.`);
            
            // Log to MQTT logs
            window.mqttClient.addLog('system', `🎮 New session started: ${sessionId}`);
            
            return true;
        } else {
            this.showToast('error', 'Failed to assign session ID. Check MQTT connection.');
            return false;
        }
    }
    
    /**
     * Stop current session and reset to default (999)
     */
    stopSession() {
        if (!window.mqttClient || !window.mqttClient.connected) {
            this.showToast('error', 'MQTT not connected! Cannot stop session.');
            return false;
        }
        
        // Confirm action
        if (!confirm('Stop current session?\n\nAll devices will reset to default session ID (999).')) {
            return false;
        }
        
        // Reset to default session ID
        const success = window.mqttClient.assignSessionId(999);
        
        if (success) {
            this.currentSession = 999;
            this.updateSessionUI(999);
            this.showToast('info', 'Session stopped. All devices reset to session 999.');
            
            // Log to MQTT logs
            window.mqttClient.addLog('system', '⏹️ Session stopped, reset to 999');
            
            return true;
        } else {
            this.showToast('error', 'Failed to stop session. Check MQTT connection.');
            return false;
        }
    }
    
    /**
     * Update session UI elements
     */
    updateSessionUI(sessionId) {
        const sessionStatEl = document.getElementById('stat-session');
        if (sessionStatEl) {
            sessionStatEl.textContent = sessionId;
            
            // Change color based on session
            if (sessionId === 999) {
                sessionStatEl.className = 'text-3xl font-bold text-gray-400';
            } else {
                sessionStatEl.className = 'text-3xl font-bold text-blue-400';
            }
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create session button
        const createBtn = document.getElementById('create-session-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const input = document.getElementById('new-session-id');
                const sessionId = parseInt(input.value);
                
                if (this.createSession(sessionId)) {
                    input.value = '';  // Clear input on success
                }
            });
        }
        
        // Stop session button
        const stopBtn = document.getElementById('stop-session-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopSession();
            });
        }
        
        // Enter key on session ID input
        const input = document.getElementById('new-session-id');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const sessionId = parseInt(input.value);
                    if (this.createSession(sessionId)) {
                        input.value = '';
                    }
                }
            });
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
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 4000);
    }
}

// Create global instance
window.SessionManager = new SessionManager();
/**
 * Dashboard Main Controller
 * Initializes all modules and sets up global event listeners
 */

class Dashboard {
    constructor() {
        this.initialized = false;
    }
    
    /**
     * Initialize dashboard
     */
    async init() {
        console.log('[Dashboard] Initializing...');
        
        // Setup global event listeners
        this.setupGlobalEventListeners();
        
        // Setup device manager
        if (window.DeviceManager) {
            window.DeviceManager.setupEventListeners();
            window.DeviceManager.startPeriodicUpdates();
        }
        
        // Setup session manager
        if (window.SessionManager) {
            window.SessionManager.setupEventListeners();
        }
        
        // Connect to MQTT
        if (window.mqttClient) {
            window.mqttClient.connect();
        }
        
        this.initialized = true;
        console.log('[Dashboard] Initialized successfully!');
    }
    
    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        
        // Clear logs button
        const clearLogsBtn = document.getElementById('clear-logs-btn');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                if (window.mqttClient) {
                    window.mqttClient.clearLogs();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R: Refresh (prevent default)
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                location.reload();
            }
            
            // Ctrl/Cmd + L: Clear logs
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                if (window.mqttClient) {
                    window.mqttClient.clearLogs();
                }
            }
        });
        
        // Window beforeunload - disconnect MQTT
        window.addEventListener('beforeunload', () => {
            if (window.mqttClient && window.mqttClient.connected) {
                window.mqttClient.disconnect();
            }
        });
    }
    
    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🏠  ESCAPE ROOM ADMIN PANEL v2.0                                ║
║                                                                    ║
║   📡 MQTT Status: Check header indicator                          ║
║   🎮 Session Management: Use controls above                       ║
║   🔧 Device Control: Click buttons on device cards                ║
║                                                                    ║
║   Keyboard Shortcuts:                                             ║
║   • Ctrl/Cmd + R → Refresh page                                   ║
║   • Ctrl/Cmd + L → Clear logs                                     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
        `);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    dashboard.showWelcomeMessage();
    dashboard.init();
});
// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.body.className = savedTheme;
    
    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark-mode' ? '☀️' : '🌙';
    }
    
    // Initialize any other global functionality
    initializePresence();
});

// Initialize presence system
function initializePresence() {
    const uid = localStorage.getItem('uid');
    if (!uid) return;
    
    const userStatusRef = db.ref('/presence/' + uid);
    const userStatusDatabaseRef = db.ref('/status/' + uid);
    
    // Set initial status
    userStatusDatabaseRef.onDisconnect().set({
        status: 'offline',
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        userStatusDatabaseRef.set({
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    });
    
    // Update status when window is focused/blurred
    window.addEventListener('focus', () => {
        userStatusDatabaseRef.set({
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    });
    
    window.addEventListener('blur', () => {
        userStatusDatabaseRef.set({
            status: 'away',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    });
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

// Helper function to generate random IDs
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

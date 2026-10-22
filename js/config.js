// GetCalcu — Public runtime config
// Firebase Client configuration
const APP_CONFIG = {
    FIREBASE: {
        apiKey: "AIzaSyDjFGku4UvEDBzgi8WNNX46Xgo8u6UF1zk",
        authDomain: "getcalcu-98dc0.firebaseapp.com",
        projectId: "getcalcu-98dc0",
        storageBucket: "getcalcu-98dc0.firebasestorage.app",
        messagingSenderId: "672912367081",
        appId: "1:672912367081:web:e525a126ce57c1129abf78",
        measurementId: "G-9R2C0BJHV3"
    },
    SITE_URL: 'https://www.getcalcu.com',
    ADS_ENABLED: false, // Set to true when ready to activate ad network
    // EmailJS credentials held server-side in Vercel environment variables
};

// Early auth listener queue — guarantees callbacks are never dropped regardless of script load order
if (typeof window !== 'undefined') {
    window._authCallbacks = window._authCallbacks || [];
    if (typeof window.onAuthChange !== 'function') {
        window.onAuthChange = function(cb) {
            if (typeof cb === 'function') {
                window._authCallbacks.push(cb);
                if (window._currentAuthSession !== undefined) {
                    try { cb(window._currentAuthSession); } catch(e) { console.error('[GetCalcu] Auth callback error:', e); }
                }
            }
            return function() {
                var idx = window._authCallbacks.indexOf(cb);
                if (idx !== -1) window._authCallbacks.splice(idx, 1);
            };
        };
    }
}

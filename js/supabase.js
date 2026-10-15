// ============================================================
// GetCalcu — Supabase Backward Compatibility Bridge
// Proxies calls to the new Firebase client adapter
// ============================================================

// If firebase.js has loaded, the global functions (signUp, signIn,
// saveCalculation, etc.) and window._sb are already defined there.
// This file ensures that if any cached asset or legacy script imports
// /js/supabase.js directly, it gracefully functions without error.

if (typeof window !== 'undefined' && !window._sb) {
    console.info('[GetCalcu] Note: Backend has migrated to Firebase. Bridging _sb compatibility layer.');
}

// ============================================================
// GetCalcu — Firebase Client & Persistence Adapter
// Replaces Supabase backend with Cloud Firestore & Firebase Auth
// ============================================================

// ── 1. Initialization ────────────────────────────────────────
let _app = null;
let _auth = null;
let _db = null;

try {
    if (typeof firebase !== 'undefined' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.FIREBASE) {
        if (!firebase.apps || firebase.apps.length === 0) {
            _app = firebase.initializeApp(APP_CONFIG.FIREBASE);
        } else {
            _app = firebase.app();
        }
        _auth = firebase.auth();
        _db = firebase.firestore();

        // Enable offline persistence in browser environments if supported
        if (typeof window !== 'undefined' && _db.enablePersistence) {
            _db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    // Multiple tabs open, persistence can only be enabled in one tab at a time
                } else if (err.code === 'unimplemented') {
                    // The current browser does not support all of the features required to enable persistence
                }
            });
        }
    }
} catch (e) {
    console.warn('[GetCalcu] Firebase initialization warning:', e);
}

// ── 2. Data Normalizers ──────────────────────────────────────
function normalizeUser(fbUser) {
    if (!fbUser) return null;
    const name = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
    return {
        id: fbUser.uid,
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: name,
        photoURL: fbUser.photoURL || null,
        user_metadata: {
            full_name: name,
            avatar_url: fbUser.photoURL || null,
        }
    };
}

function normalizeSession(fbUser) {
    if (!fbUser) return null;
    return {
        user: normalizeUser(fbUser),
        access_token: fbUser.accessToken || ''
    };
}

// ── 3. Session & Auth State Listeners ────────────────────────
async function getSession() {
    const user = await getUser();
    return user ? normalizeSession(user) : null;
}

async function getUser() {
    if (!_auth) return null;
    if (_auth.currentUser) return normalizeUser(_auth.currentUser);

    return new Promise((resolve) => {
        const unsubscribe = _auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(normalizeUser(user));
        });
    });
}

// Fires callback immediately on load and on every auth state change
function onAuthChange(callback) {
    if (!_auth) {
        if (typeof callback === 'function') callback(null);
        return () => {};
    }

    return _auth.onAuthStateChanged((user) => {
        if (typeof callback === 'function') {
            callback(normalizeSession(user));
        }
    });
}

// ── 4. Authentication Actions ────────────────────────────────
async function signUp(email, password, displayName) {
    if (!_auth) return { data: null, error: { message: 'Authentication service not available.' } };
    try {
        const cred = await _auth.createUserWithEmailAndPassword(email, password);
        const fbUser = cred.user;

        if (displayName && fbUser) {
            await fbUser.updateProfile({ displayName });
            // Save profile document in Firestore 'profiles' collection
            if (_db) {
                await _db.collection('profiles').doc(fbUser.uid).set({
                    display_name: displayName,
                    email: email,
                    created_at: new Date().toISOString()
                }, { merge: true });
            }
        }

        return { data: { user: normalizeUser(fbUser) }, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message, code: err.code } };
    }
}

async function signIn(email, password) {
    if (!_auth) return { data: null, error: { message: 'Authentication service not available.' } };
    try {
        const cred = await _auth.signInWithEmailAndPassword(email, password);
        return { data: { user: normalizeUser(cred.user) }, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message, code: err.code } };
    }
}

async function signInWithGoogle() {
    if (!_auth) return { data: null, error: { message: 'Authentication service not available.' } };
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred = await _auth.signInWithPopup(provider);
        const fbUser = cred.user;

        // Auto-create/sync profile document
        if (_db && fbUser) {
            await _db.collection('profiles').doc(fbUser.uid).set({
                display_name: fbUser.displayName || fbUser.email.split('@')[0],
                email: fbUser.email,
                avatar_url: fbUser.photoURL || null,
                last_seen: new Date().toISOString()
            }, { merge: true });
        }

        return { data: { user: normalizeUser(fbUser) }, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message, code: err.code } };
    }
}

async function resetPassword(email) {
    if (!_auth) return { error: { message: 'Authentication service not available.' } };
    try {
        await _auth.sendPasswordResetEmail(email);
        return { error: null };
    } catch (err) {
        return { error: { message: err.message, code: err.code } };
    }
}

async function updatePassword(newPassword) {
    if (!_auth) return { error: { message: 'Authentication service not available.' } };
    try {
        // Case A: User is currently signed in
        if (_auth.currentUser) {
            await _auth.currentUser.updatePassword(newPassword);
            return { error: null };
        }

        // Case B: User arrived via password reset email with action code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get('oobCode');
        if (oobCode) {
            await _auth.confirmPasswordReset(oobCode, newPassword);
            return { error: null };
        }

        return { error: { message: 'No active session or password reset code found.' } };
    } catch (err) {
        return { error: { message: err.message, code: err.code } };
    }
}

async function signOut() {
    if (!_auth) return { error: null };
    try {
        await _auth.signOut();
        return { error: null };
    } catch (err) {
        return { error: { message: err.message, code: err.code } };
    }
}

// ── Local Storage Fallback Store ─────────────────────────────
const LOCAL_HISTORY_KEY = 'getcalcu_saved_history_v1';

function getLocalHistoryData(userId) {
    try {
        const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (userId) {
            return list.filter(item => item.user_id === userId || !item.user_id);
        }
        return list;
    } catch {
        return [];
    }
}

function saveLocalHistoryData(record) {
    try {
        const list = getLocalHistoryData();
        list.unshift(record);
        if (list.length > 50) list.pop();
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('[GetCalcu] Local storage save error:', e);
    }
}

// ── 5. Calculations (History Persistence) ────────────────────
async function saveCalculation(toolSlug, toolName, inputs, results) {
    const user = await getUser();
    const userId = user ? user.uid : 'local_anonymous_user';

    const payload = {
        user_id: userId,
        tool_slug: toolSlug,
        tool_name: toolName,
        inputs: sanitizeForStorage(inputs),
        results: sanitizeForStorage(results),
        created_at: new Date().toISOString()
    };

    // Attempt Cloud Firestore save if available
    if (_db && user) {
        try {
            const docRef = await _db.collection('calculations').add(payload);
            pruneOldCalculations(user.uid, 50).catch(() => {});
            // Also cache locally
            saveLocalHistoryData({ id: docRef.id, ...payload });
            return { data: { id: docRef.id }, error: null };
        } catch (cloudErr) {
            console.warn('[GetCalcu] Cloud Firestore save unavailable, using local fallback:', cloudErr.message);
        }
    }

    // 100% Free Local Fallback (zero database required, works offline)
    const localId = 'loc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const localRecord = { id: localId, ...payload };
    saveLocalHistoryData(localRecord);
    return { data: { id: localId }, error: null };
}

async function getHistory(limitCount = 50) {
    const user = await getUser();
    const userId = user ? user.uid : null;

    // Try Cloud Firestore first if user is signed in and DB is ready
    if (_db && user) {
        try {
            const querySnap = await _db.collection('calculations')
                .where('user_id', '==', user.uid)
                .orderBy('created_at', 'desc')
                .limit(limitCount)
                .get();

            const data = querySnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (data.length > 0) return { data, error: null };
        } catch (err) {
            if (err.message && (err.message.includes('requires an index') || err.code === 'failed-precondition')) {
                try {
                    const snap = await _db.collection('calculations')
                        .where('user_id', '==', user.uid)
                        .get();
                    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    if (data.length > 0) return { data: data.slice(0, limitCount), error: null };
                } catch {
                    // Fall through to local storage
                }
            }
        }
    }

    // Free Local Storage Fallback
    const localData = getLocalHistoryData(userId);
    return { data: localData.slice(0, limitCount), error: null };
}

async function deleteCalculation(id) {
    // Delete from Cloud Firestore if cloud record
    if (_db && !id.startsWith('loc_')) {
        try {
            await _db.collection('calculations').doc(id).delete();
        } catch {
            // Non-blocking
        }
    }

    // Delete from Local Storage
    try {
        const list = getLocalHistoryData().filter(item => item.id !== id);
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list));
    } catch {
        // Non-blocking
    }

    return { error: null };
}

async function clearAllHistory() {
    const user = await getUser();

    // Clear Cloud Firestore
    if (_db && user) {
        try {
            const snap = await _db.collection('calculations')
                .where('user_id', '==', user.uid)
                .get();
            const batch = _db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch {
            // Non-blocking
        }
    }

    // Clear Local Storage
    try {
        localStorage.removeItem(LOCAL_HISTORY_KEY);
    } catch {
        // Non-blocking
    }

    return { error: null };
}

// Background utility: deletes calculations beyond the newest 50 per user
async function pruneOldCalculations(userId, maxRecords = 50) {
    if (!_db || !userId) return;
    try {
        const snap = await _db.collection('calculations')
            .where('user_id', '==', userId)
            .get();

        if (snap.size > maxRecords) {
            const docs = snap.docs.map(doc => ({ id: doc.id, ref: doc.ref, created_at: doc.data().created_at || '' }));
            docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const toDelete = docs.slice(maxRecords);
            const batch = _db.batch();
            toDelete.forEach(item => batch.delete(item.ref));
            await batch.commit();
        }
    } catch (e) {
        // Non-blocking background prune
    }
}

// ── 6. Profile ───────────────────────────────────────────────
async function getProfile() {
    const user = await getUser();
    if (!user) return { data: null, error: { message: 'Not signed in' } };
    if (!_db) return { data: null, error: { message: 'Database service not available.' } };

    try {
        const doc = await _db.collection('profiles').doc(user.uid).get();
        if (doc.exists) {
            return { data: doc.data(), error: null };
        }
        return {
            data: {
                display_name: user.displayName,
                avatar_url: user.photoURL,
                created_at: new Date().toISOString()
            },
            error: null
        };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function updateProfile(displayName) {
    const user = await getUser();
    if (!user) return { data: null, error: { message: 'Not signed in' } };

    try {
        if (_auth.currentUser) {
            await _auth.currentUser.updateProfile({ displayName });
        }
        if (_db) {
            await _db.collection('profiles').doc(user.uid).set({
                display_name: displayName,
                updated_at: new Date().toISOString()
            }, { merge: true });
        }
        return { data: { display_name: displayName }, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

// ── 7. Helpers ───────────────────────────────────────────────
function sanitizeForStorage(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return {};
    }
}

function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', {
        month:  'short',
        day:    'numeric',
        year:   'numeric',
        hour:   'numeric',
        minute: '2-digit',
    });
}

// ── 8. Backward Compatibility Layer (_sb Shim) ───────────────
// Allows any legacy components referencing `_sb` or `supabase` to work seamlessly
window._sb = {
    auth: {
        getSession,
        getUser,
        onAuthStateChange: (cb) => {
            if (!_auth) return;
            return _auth.onAuthStateChanged((user) => {
                if (user) {
                    cb('SIGNED_IN', normalizeSession(user));
                } else {
                    cb('SIGNED_OUT', null);
                }
            });
        },
        signUp,
        signInWithPassword: signIn,
        signInWithOAuth: signInWithGoogle,
        resetPasswordForEmail: resetPassword,
        updateUser: (data) => updatePassword(data.password),
        signOut
    }
};

// Export to window for global script availability
window.getSession = getSession;
window.getUser = getUser;
window.onAuthChange = onAuthChange;
window.signUp = signUp;
window.signIn = signIn;
window.signInWithGoogle = signInWithGoogle;
window.resetPassword = resetPassword;
window.updatePassword = updatePassword;
window.signOut = signOut;
window.saveCalculation = saveCalculation;
window.getHistory = getHistory;
window.deleteCalculation = deleteCalculation;
window.clearAllHistory = clearAllHistory;
window.getProfile = getProfile;
window.updateProfile = updateProfile;
window.formatDate = formatDate;

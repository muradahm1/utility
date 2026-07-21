// ============================================================
// UtilityHub — Supabase Client & Helpers
// ============================================================

const SUPABASE_URL  = 'https://uvkukqdrkvqhzrvfgxgq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VrcWRya3ZxaHpydmZneGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTgzMDUsImV4cCI6MjEwMDE3NDMwNX0.lnzPHVUWFsZQ6mikxO2hQd9Uy1bjMutmvQXa8A8_-cA';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        autoRefreshToken:    true,
        persistSession:      true,
        detectSessionInUrl:  true,
        storageKey:          'uh_session',
    }
});

// ── Session ──────────────────────────────────────────────────

async function getSession() {
    const { data: { session } } = await _sb.auth.getSession();
    return session;
}

async function getUser() {
    const { data: { user } } = await _sb.auth.getUser();
    return user;
}

// Fires callback immediately with current session, then on every change
function onAuthChange(callback) {
    _sb.auth.onAuthStateChange((_event, session) => callback(session));
    // Also fire immediately
    getSession().then(callback);
}

// ── Auth Actions ─────────────────────────────────────────────

async function signUp(email, password, displayName) {
    const { data, error } = await _sb.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: displayName },
            emailRedirectTo: `${location.origin}/index.html`,
        }
    });
    return { data, error };
}

async function signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    return { data, error };
}

async function signInWithGoogle() {
    const { data, error } = await _sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/index.html` }
    });
    return { data, error };
}

async function resetPassword(email) {
    const { data, error } = await _sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth.html?mode=update-password`,
    });
    return { data, error };
}

async function updatePassword(newPassword) {
    const { data, error } = await _sb.auth.updateUser({ password: newPassword });
    return { data, error };
}

async function signOut() {
    const { error } = await _sb.auth.signOut();
    return { error };
}

// ── Calculations (History) ───────────────────────────────────

async function saveCalculation(toolSlug, toolName, inputs, results) {
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { data, error } = await _sb
        .from('calculations')
        .insert({
            user_id:   user.id,
            tool_slug: toolSlug,
            tool_name: toolName,
            inputs:    sanitizeForStorage(inputs),
            results:   sanitizeForStorage(results),
        })
        .select('id')
        .single();

    return { data, error };
}

async function getHistory(limit = 50) {
    const { data, error } = await _sb
        .from('calculations')
        .select('id, tool_slug, tool_name, inputs, results, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data, error };
}

async function deleteCalculation(id) {
    const { error } = await _sb
        .from('calculations')
        .delete()
        .eq('id', id);

    return { error };
}

async function clearAllHistory() {
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { error } = await _sb
        .from('calculations')
        .delete()
        .eq('user_id', user.id);

    return { error };
}

// ── Profile ──────────────────────────────────────────────────

async function getProfile() {
    const { data, error } = await _sb
        .from('profiles')
        .select('display_name, avatar_url, created_at')
        .single();

    return { data, error };
}

async function updateProfile(displayName) {
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { data, error } = await _sb
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user.id)
        .select()
        .single();

    return { data, error };
}

// ── Helpers ──────────────────────────────────────────────────

// Strip any non-serializable values before storing in jsonb
function sanitizeForStorage(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return {};
    }
}

// Format a UTC timestamp to a readable local string
function formatDate(isoString) {
    return new Date(isoString).toLocaleString('en-US', {
        month:  'short',
        day:    'numeric',
        year:   'numeric',
        hour:   'numeric',
        minute: '2-digit',
    });
}

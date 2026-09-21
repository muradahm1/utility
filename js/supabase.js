// ============================================================
// UtilityHub — Supabase Client & Helpers
// ============================================================

let _sb = null;

function getSupabase() {
    if (_sb) return _sb;
    if (typeof supabase === 'undefined' || typeof APP_CONFIG === 'undefined') {
        return null;
    }
    try {
        _sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON, {
            auth: {
                autoRefreshToken:    true,
                persistSession:      true,
                detectSessionInUrl:  true,
                storageKey:          'uh_session',
            }
        });
    } catch (e) {
        console.warn('[Supabase] Init deferred or unavailable:', e);
    }
    return _sb;
}

// ── Session ──────────────────────────────────────────────────

async function getSession() {
    const client = getSupabase();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
}

async function getUser() {
    const client = getSupabase();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
}

// Fires callback immediately with current session, then on every change
function onAuthChange(callback) {
    const client = getSupabase();
    if (!client) {
        // If not initialized yet, invoke with null session
        callback(null);
        return;
    }
    client.auth.onAuthStateChange((_event, session) => callback(session));
    // Also fire immediately
    getSession().then(callback);
}

// ── Auth Actions ─────────────────────────────────────────────

async function signUp(email, password, displayName) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Authentication service unavailable' } };
    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: displayName },
            emailRedirectTo: `${location.origin}/`,
        }
    });
    return { data, error };
}

async function signIn(email, password) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Authentication service unavailable' } };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { data, error };
}

async function signInWithGoogle() {
    const client = getSupabase();
    if (!client) return { error: { message: 'Authentication service unavailable' } };
    const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/` }
    });
    return { data, error };
}

async function resetPassword(email) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Authentication service unavailable' } };
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth?mode=update-password`,
    });
    return { data, error };
}

async function updatePassword(newPassword) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Authentication service unavailable' } };
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    return { data, error };
}

async function signOut() {
    const client = getSupabase();
    if (!client) return { error: null };
    const { error } = await client.auth.signOut();
    return { error };
}

// ── Calculations (History) ───────────────────────────────────

async function saveCalculation(toolSlug, toolName, inputs, results) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Not signed in' } };
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { data, error } = await client
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
    const client = getSupabase();
    if (!client) return { data: [], error: { message: 'Not signed in' } };
    const user = await getUser();
    if (!user) return { data: [], error: { message: 'Not signed in' } };

    const { data, error } = await client
        .from('calculations')
        .select('id, tool_slug, tool_name, inputs, results, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data, error };
}

async function deleteCalculation(id) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Not signed in' } };
    const { error } = await client
        .from('calculations')
        .delete()
        .eq('id', id);

    return { error };
}

async function clearAllHistory() {
    const client = getSupabase();
    if (!client) return { error: { message: 'Not signed in' } };
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { error } = await client
        .from('calculations')
        .delete()
        .eq('user_id', user.id);

    return { error };
}

// ── Profile ──────────────────────────────────────────────────

async function getProfile() {
    const client = getSupabase();
    if (!client) return { error: { message: 'Not signed in' } };
    const { data, error } = await client
        .from('profiles')
        .select('display_name, avatar_url, created_at')
        .single();

    return { data, error };
}

async function updateProfile(displayName) {
    const client = getSupabase();
    if (!client) return { error: { message: 'Not signed in' } };
    const user = await getUser();
    if (!user) return { error: { message: 'Not signed in' } };

    const { data, error } = await client
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

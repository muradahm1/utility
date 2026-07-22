// GetCalcu — Public runtime config
// These are the Supabase *anon* (public) keys — safe to ship in frontend code.
// The anon key has zero privileges beyond what Row Level Security allows.
// NEVER put your service_role key here.
const APP_CONFIG = {
    SUPABASE_URL:  'https://www.getcalcu.com/supa-api',
    SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VrcWRya3ZxaHpydmZneGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTgzMDUsImV4cCI6MjEwMDE3NDMwNX0.lnzPHVUWFsZQ6mikxO2hQd9Uy1bjMutmvQXa8A8_-cA',
    SITE_URL: 'https://www.getcalcu.com',
};

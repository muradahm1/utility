// GetCalcu — Public runtime config
// The Supabase ANON key is intentionally public — it is safe to expose in
// frontend code ONLY because Row Level Security (RLS) is enforced on ALL
// tables in Supabase. Never use the service_role key here.
// Verify RLS is ON: Supabase Dashboard → Table Editor → RLS column = Enabled
const APP_CONFIG = {
    SUPABASE_URL:  'https://uvkukqdrkvqhzrvfgxgq.supabase.co',
    SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VrcWRya3ZxaHpydmZneGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTgzMDUsImV4cCI6MjEwMDE3NDMwNX0.lnzPHVUWFsZQ6mikxO2hQd9Uy1bjMutmvQXa8A8_-cA',
    SITE_URL: 'https://www.getcalcu.com',
};

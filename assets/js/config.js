// Supabase Configuration
const SUPABASE_CONFIG = {
  url: "https://qvhcrarovkpmfferfigh.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aGNyYXJvdmtwbWZmZXJmaWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjM1MzgsImV4cCI6MjA4MTAzOTUzOH0.8_0F7KUZ_xP7lSBNCbNcF1CZf4A-wVIIyvw_7fW-jrY"
};

const supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
window.supabase = supabaseClient;


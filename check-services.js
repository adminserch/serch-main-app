const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file manually to avoid dependency requirements
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingVars = [];
if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const providerId = process.env.PROVIDER_ID || process.argv[2];
if (!providerId) {
  console.error('Error: PROVIDER_ID is required to run this script.');
  console.error('Usage: PROVIDER_ID=<uuid> node check-services.js or node check-services.js <uuid>');
  process.exit(1);
}

async function run() {
  console.log('Querying pg_policies:');
  const { data, error } = await supabaseAdmin.rpc('get_policies');
  if (error) {
    console.error('get_policies RPC failed:', error);
    process.exit(1);
  }
  console.log('Retrieved policies:', JSON.stringify(data, null, 2));

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('Testing select on services as anon:');
  const { data: anonServices, error: anonErr } = await supabaseAnon
    .from('services')
    .select('*')
    .eq('provider_id', providerId);
    
  if (anonErr) {
    console.error('Anon select error:', anonErr);
    process.exit(1);
  }
  
  if (!anonServices || anonServices.length === 0) {
    console.error(`Error: No services found for provider ID: ${providerId}`);
    process.exit(1);
  }
  
  console.log('Anon select results:', JSON.stringify(anonServices, null, 2));
}

run();

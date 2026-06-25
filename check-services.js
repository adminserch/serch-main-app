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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Querying pg_policies:');
  const { data, error } = await supabaseAdmin.rpc('get_policies');
  if (error) {
    console.error('get_policies RPC failed:', error);
    process.exit(1);
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('Testing select on services as anon:');
  const { data: anonServices, error: anonErr } = await supabaseAnon
    .from('services')
    .select('*')
    .eq('provider_id', '5170ab5b-6341-4c0f-8f76-648a09dfe9e9');
    
  if (anonErr) {
    console.error('Anon select error:', anonErr);
    process.exit(1);
  } else {
    console.log('Anon select results:', JSON.stringify(anonServices, null, 2));
  }
}

run();

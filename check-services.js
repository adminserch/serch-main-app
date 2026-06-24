const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tadcpqqrszwpkudtsvgr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZGNwcXFyc3p3cGt1ZHRzdmdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM2MTI4MywiZXhwIjoyMDk2OTM3MjgzfQ.aUf58aEEQ4u0_wxxu-SZ0rZlCCEoX1cukiNbVYBll4Q';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Querying pg_policies:');
  const { data, error } = await supabaseAdmin.rpc('get_policies'); // Wait, if RPC get_policies doesn't exist, we can use raw SQL query or check pg_policies table.
  // In Supabase, we can query pg_policies using RPC if we created one, or we can just run a query using custom SQL endpoint or just inspect what policies we have.
  // Wait! Let's just query pg_policies using an ad-hoc select if it's exposed, or wait, we can't select from pg_policies directly via postgrest unless it's exposed.
  // But wait! We can run a query to the pg_policies via a custom RPC, or wait!
  // Let's check what policies are active in the database by performing a SELECT query as the anon client!
  const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZGNwcXFyc3p3cGt1ZHRzdmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNjEyODMsImV4cCI6MjA5NjkzNzI4M30.o9s_KKerG7Iimmfj_RwIdGi8jPbxsYKcfXT9V_pvsFc');
  
  console.log('Testing select on services as anon:');
  const { data: anonServices, error: anonErr } = await supabaseAnon
    .from('services')
    .select('*')
    .eq('provider_id', '5170ab5b-6341-4c0f-8f76-648a09dfe9e9');
    
  if (anonErr) {
    console.error('Anon select error:', anonErr);
  } else {
    console.log('Anon select results:', JSON.stringify(anonServices, null, 2));
  }
}

run();

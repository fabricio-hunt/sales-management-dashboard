import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error, count } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Error querying Supabase:", error);
  } else {
    console.log(`Success! Found ${count} records in the 'pedidos' table.`);
  }
}

checkData();

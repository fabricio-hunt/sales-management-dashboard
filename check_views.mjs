import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViews() {
  const { data: resumo, error: resumoError } = await supabase
    .from('v_resumo_dashboard')
    .select('*')
    .single();

  if (resumoError) {
    console.error("Error querying v_resumo_dashboard:", JSON.stringify(resumoError));
  } else {
    console.log("Success querying v_resumo_dashboard:", resumo);
  }

  const { data: vendas, error: vendasError } = await supabase
    .from('v_vendas_por_mes')
    .select('*');

  if (vendasError) {
    console.error("Error querying v_vendas_por_mes:", JSON.stringify(vendasError));
  } else {
    console.log(`Success querying v_vendas_por_mes. Rows: ${vendas?.length}`);
  }
}

checkViews();

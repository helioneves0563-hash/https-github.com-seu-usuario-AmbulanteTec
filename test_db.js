import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read config to get keys
const fileContent = fs.readFileSync('/Users/heliodasneves/Documents/Projetos antigravity e Lovable/AmbulanteTec/assets/js/supabaseConfig.js', 'utf8');
const urlMatch = fileContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = fileContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  async function test() {
    console.log('Fetching Margo...');
    const { data: customers } = await supabase.from('customers').select('*').ilike('name', '%Margo%');
    console.log(customers);
    if(customers && customers.length > 0) {
      console.log('Fetching orders for', customers[0].id);
      const { data: orders, error } = await supabase.from('orders').select('*').eq('customer_id', customers[0].id);
      console.log(orders, error);
    }
  }
  test();
} else {
  console.log("Could not find credentials");
}

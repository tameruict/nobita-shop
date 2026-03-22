import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get config from bank_setting
    const { data: configs, error: cfgErr } = await supabase
      .from('bank_setting')
      .select('*')
      .limit(1);

    if (cfgErr || !configs || configs.length === 0) {
      throw new Error("Missing bank_setting configuration");
    }

    const config = configs[0];
    const password = config.api_password || 'none'; // Thueapibank API mostly ignores password for Token users 
    const sotaikhoan = config.account_number;
    const token = config.api_token;

    if (!sotaikhoan || !token) {
       throw new Error("Invalid API config in bank_setting (missing account or token)");
    }

    // Call thueapibank.vn API
    // The endpoint uses the dummy password placeholder if no password is provided in DB
    const API_URL = `https://thueapibank.vn/historyapivcbv3/${password}/${sotaikhoan}/${token}`;
    
    const bankRes = await fetch(API_URL);
    if (!bankRes.ok) {
       throw new Error(`Failed to fetch from thueapibank.vn: ${bankRes.status}`);
    }
    const bankData = await bankRes.json();
    
    // Parse transactions
    let transactions = [];
    if (Array.isArray(bankData)) {
       transactions = bankData;
    } else if (bankData?.data && Array.isArray(bankData.data)) {
       transactions = bankData.data;
    } else if (bankData?.History && Array.isArray(bankData.History)) {
       transactions = bankData.History;
    }

    // Get pending deposit_requests
    const { data: pendingRequests, error: reqError } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('status', 'pending');

    if (reqError) throw reqError;

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;

    for (const req of pendingRequests) {
      const depositCode = req.deposit_code.toUpperCase();
      const expectedAmount = Number(req.expected_amount);

      // Match transaction
      const matchedTx = transactions.find((tx) => {
        const amount = Number(tx.SoTienGhiCo || tx.Amount || tx.amount || 0);
        const description = String(tx.MoTa || tx.Description || tx.description || '').toUpperCase();
        return amount >= expectedAmount && description.includes(depositCode);
      });

      if (matchedTx) {
         // Update request to completed
         const { error: updErr } = await supabase
           .from('deposit_requests')
           .update({ 
               status: 'completed', 
               matched_txn_id: null // normally we'd save matched ID if available 
           })
           .eq('id', req.id);
           
         if (updErr) {
            console.error("Failed to update deposit_request:", updErr);
            continue;
         }

         if (req.type === 'topup' || !req.type) {
            // Case 1: Topup
            // Add wallet transaction
            await supabase.from('wallet_transactions').insert([{
              user_id: req.user_id,
              amount: expectedAmount,
              type: 'deposit',
              status: 'completed'
            }]);

            // Add balance
            const { data: userProf } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
            if (userProf) {
               const newBal = (userProf.balance || 0) + expectedAmount;
               await supabase.from('profiles').update({ balance: newBal }).eq('id', req.user_id);
            }
         } else if (req.type === 'order' && req.order_id) {
            // Case 2: Direct Order
            await supabase.from('orders').update({
               status: 'completed'
            }).eq('id', req.order_id);
            
            // Optionally insert into wallet_transactions just for logging that a payment happened (if needed)
            await supabase.from('wallet_transactions').insert([{
              user_id: req.user_id,
              amount: expectedAmount,
              type: 'payment',
              status: 'completed'
            }]);
         }

         processedCount++;
      }
    }

    return new Response(JSON.stringify({ processed: processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

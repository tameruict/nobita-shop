import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const VCB_PASSWORD = Deno.env.get('VCB_PASSWORD');
    const VCB_ACCOUNT = Deno.env.get('VCB_ACCOUNT');
    
    // API endpoint based on user instruction
    const API_URL = `https://thueapibank.vn/historyapivcbv3/${VCB_PASSWORD}/${VCB_ACCOUNT}/d5259d1f01433a8068f98b935d2b48aa`;

    if (!VCB_PASSWORD || !VCB_ACCOUNT) {
      throw new Error("Missing VCB_PASSWORD or VCB_ACCOUNT environment variables in Supabase.");
    }

    // Initialize Supabase Admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get pending deposits
    const { data: pendingRequests, error: reqError } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('bank_code', 'vietcombank');

    if (reqError) throw reqError;

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch VCB History
    const bankRes = await fetch(API_URL);
    if (!bankRes.ok) {
       throw new Error(`Failed to fetch from thueapibank.vn: ${bankRes.status}`);
    }
    const bankData = await bankRes.json();
    
    // Attempt to handle typical payload structures from scraping API
    let transactions = [];
    if (Array.isArray(bankData)) {
       transactions = bankData;
    } else if (bankData?.data && Array.isArray(bankData.data)) {
       transactions = bankData.data;
    } else if (bankData?.History && Array.isArray(bankData.History)) {
       transactions = bankData.History;
    }

    let processedCount = 0;

    for (const req of pendingRequests) {
      const depositCode = req.deposit_code.toUpperCase();
      const expectedAmount = Number(req.expected_amount);

      // Find a matching transaction in bank history
      const matchedTx = transactions.find((tx) => {
        // Different variations of amount and description keys
        const amount = Number(tx.SoTienGhiCo || tx.Amount || tx.amount || 0);
        const description = String(tx.MoTa || tx.Description || tx.description || '').toUpperCase();
        
        return amount >= expectedAmount && description.includes(depositCode);
      });

      if (matchedTx) {
         // Approve request
         const { error: updErr } = await supabase
           .from('deposit_requests')
           .update({ status: 'completed' })
           .eq('id', req.id);
           
         if (updErr) {
            console.error("Failed to update deposit_request:", updErr);
            continue;
         }

         // Create wallet transaction
         const { error: insertErr } = await supabase
           .from('wallet_transactions')
           .insert([{
             user_id: req.user_id,
             amount: expectedAmount,
             type: 'deposit',
             status: 'completed'
           }]);

         if (insertErr) {
             console.error("Failed to insert wallet_transaction:", insertErr);
         }

         // Add amount to profile balance
         const { data: userProf } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
         if (userProf) {
            const newBal = (userProf.balance || 0) + expectedAmount;
            await supabase.from('profiles').update({ balance: newBal }).eq('id', req.user_id);
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

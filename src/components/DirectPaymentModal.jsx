import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation, Trans } from 'react-i18next';

export default function DirectPaymentModal({ isOpen, onClose, plan, userId, profile }) {
  const { t, i18n } = useTranslation();
  const [bankInfo, setBankInfo] = useState({ account_number: '0000000000', account_name: 'CHUA CAI DAT TEN' });

  const formatVnd = (amount) => {
    return new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(amount ?? 0) + (i18n.language === 'vi' ? ' ₫' : ' VND');
  };
  const [pendingRequest, setPendingRequest] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && plan && userId && !pendingRequest && !isCreating) {
      initiatePayment();
    }
  }, [isOpen, plan, userId]);

  useEffect(() => {
    let checkInterval;
    if (pendingRequest && !success) {
      checkInterval = setInterval(async () => {
        try {
          // Poll check-payment
          const { data } = await supabase.functions.invoke('check-payment', { method: 'POST' });
          
          // Also check DB just in case webhook updated it
          const { data: latestReq } = await supabase
            .from('deposit_requests')
            .select('status')
            .eq('id', pendingRequest.id)
            .single();

          if (latestReq?.status === 'completed' || data?.processed > 0) {
            setSuccess(true);
            clearInterval(checkInterval);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 10000); // every 10 seconds
    }
    return () => clearInterval(checkInterval);
  }, [pendingRequest, success]);

  const initiatePayment = async () => {
    setIsCreating(true);
    setSuccess(false);
    try {
      // 1. Fetch bank info
      let bInfo = { account_number: '0000000000', account_name: 'CHUA CAI DAT TEN' };
      const { data: bankData, error: bankErr } = await supabase.rpc('get_vietcombank_info');
      if (!bankErr && bankData?.[0]) bInfo = bankData[0];
      else {
        const { data: vtData } = await supabase.rpc('get_vietinbank_info');
        if (vtData?.[0]) bInfo = vtData[0];
      }
      setBankInfo(bInfo);

      // 2. Create order and request
      const userPrefix = userId.split('-')[0].substring(0, 4).toUpperCase();
      const code = `tai lieu ai ORD${userPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

      // Try creating an order first
      let orderId = null;
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          order_code: code,
          total_amount: plan.priceVnd,
          status: 'pending',
          note: `Direct purchase: ${plan.name}`
        })
        .select()
        .single();
        
      if (!orderErr && orderData) {
         orderId = orderData.id;
      }

      // Create deposit request
      const req = {
        user_id: userId,
        deposit_code: code,
        expected_amount: Number(plan.priceVnd),
        bank_code: 'vietcombank',
        bank_account_no: bInfo.account_number,
        bank_account_name: bInfo.account_name,
        status: 'pending',
        type: 'order',
        order_id: orderId
      };
      
      const { data: reqData, error: reqErr } = await supabase
        .from('deposit_requests')
        .insert([req])
        .select()
        .single();
        
      if (reqErr) throw reqErr;
      
      setPendingRequest(reqData);

    } catch (err) {
      console.error("Error initiating payment:", err);
      alert(t('purchase.direct.createError') + err.message);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setPendingRequest(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  const vietQrUrl = pendingRequest 
    ? `https://img.vietqr.io/image/vietcombank-${bankInfo.account_number}-compact2.png?amount=${pendingRequest.expected_amount}&addInfo=${encodeURIComponent(pendingRequest.deposit_code)}&accountName=${encodeURIComponent(bankInfo.account_name)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-[#0f1115] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-bold text-white tracking-wide">
            {success ? t('purchase.direct.successTitle') : t('purchase.direct.title')}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center min-h-[400px] justify-center text-center">
          {isCreating ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
              <p className="text-slate-400 text-sm">{t('purchase.direct.creating')}</p>
            </div>
          ) : success ? (
             <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h2 className="text-2xl font-black text-white">{t('purchase.direct.successTitle')}!</h2>
                <p className="text-slate-400 text-sm max-w-[250px]">
                  <Trans 
                    i18nKey="purchase.direct.successDesc"
                    values={{ name: plan?.name }}
                    components={{ b: <span className="text-primary font-bold" /> }}
                  />
                </p>
                <button 
                  onClick={handleClose}
                  className="mt-6 bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-500 transition-colors"
                >
                  {t('purchase.direct.doneBtn')}
                </button>
             </div>
          ) : pendingRequest ? (
            <div className="w-full flex flex-col items-center">
              <p className="text-slate-400 text-sm mb-4">
                <Trans 
                  i18nKey="purchase.direct.buyInfo"
                  values={{ name: plan?.name, price: formatVnd(plan?.priceVnd) }}
                  components={{ b: <span className="font-bold text-white" /> }}
                />
              </p>
              
              {vietQrUrl && (
                <div className="bg-white p-2 rounded-xl mb-6 shadow-[0_0_30px_rgba(0,195,255,0.2)]">
                  <img src={vietQrUrl} alt="VietQR Code" className="w-48 h-48 object-contain rounded-lg" />
                </div>
              )}

              <div className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{t('purchase.direct.bank')}:</span>
                  <span className="font-bold text-white">Vietcombank</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{t('purchase.direct.accountNo')}:</span>
                  <span className="font-bold text-white tracking-widest">{bankInfo?.account_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{t('purchase.direct.accountName')}:</span>
                  <span className="font-bold text-white uppercase">{bankInfo?.account_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{t('purchase.direct.amount')}:</span>
                  <span className="font-black text-primary">{formatVnd(pendingRequest.expected_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('purchase.direct.content')}:</span>
                  <span className="font-black text-neon-purple tracking-widest">{pendingRequest.deposit_code}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-sm text-primary">sync</span>
                  {t('purchase.direct.waiting')}
                </p>
                <p className="text-[10px] text-red-400 italic">
                  {t('purchase.direct.autoConfirmNote')}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

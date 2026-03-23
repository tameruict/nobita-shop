import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatVnd(amount, lng = 'vi') {
  return new Intl.NumberFormat(lng === 'vi' ? 'vi-VN' : 'en-US').format(amount ?? 0) + (lng === 'vi' ? ' ₫' : ' VND')
}

export default function Topup() {
  const { t, i18n } = useTranslation()
  const { session, profile, refreshProfile } = useAuth()
  
  const [transactions, setTransactions] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Pending request and bank info
  const [pendingRequest, setPendingRequest] = useState(null)
  const [bankInfo, setBankInfo] = useState({ account_number: '', account_name: '' })

  const [searchParams] = useSearchParams()

  const userId = session?.user?.id

  // Stats
  const [totalTopup, setTotalTopup] = useState(0)

  useEffect(() => {
    const amt = searchParams.get('amount');
    if (amt && !isNaN(amt)) {
      setAmount(amt);
    }
  }, [searchParams])

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const txns = data || []
      setTransactions(txns)
      
      const total = txns
          .filter(t => t.status === 'completed' || !t.status)
          .reduce((acc, curr) => acc + (curr.amount || 0), 0)
      setTotalTopup(total)
    } catch (err) {
      console.error('Error fetching deposit history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [userId])

  const fetchBankInfoAndPending = useCallback(async () => {
    if (!userId) return
    try {
      // Get bank info, try to use get_vietcombank_info if available, else fallback
      const { data: bankData, error: bankErr } = await supabase.rpc('get_vietcombank_info')
      if (!bankErr && bankData?.[0]) {
        setBankInfo(bankData[0])
      } else {
        // Fallback to get_vietinbank_info (in case the RPC hasn't been updated yet)
        const { data: vtData, error: vtErr } = await supabase.rpc('get_vietinbank_info')
        if (!vtErr && vtData?.[0]) {
           setBankInfo(vtData[0])
        }
      }

      // Check if user has an active pending request
      const { data: reqData, error: reqErr } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!reqErr && reqData) {
        setPendingRequest(reqData)
      }
    } catch (err) {
      console.error('Error fetching bank/pending info:', err)
    }
  }, [userId])

  useEffect(() => {
    fetchHistory()
    fetchBankInfoAndPending()
  }, [fetchHistory, fetchBankInfoAndPending])

  const handleCreateRequest = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(amount) || Number(amount) < 10000) {
      alert(t('topup.alerts.invalidAmount'))
      return
    }

    setIsSubmitting(true)
    try {
      // Generate a short unique deposit code
      const userPrefix = userId.split('-')[0].substring(0, 4).toUpperCase();
      const code = `tai lieu ai NBT${userPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

      const req = {
        user_id: userId,
        deposit_code: code,
        expected_amount: Number(amount),
        bank_code: 'vietcombank',
        bank_account_no: bankInfo.account_number,
        bank_account_name: bankInfo.account_name,
        status: 'pending'
      }
      
      const { data, error } = await supabase
        .from('deposit_requests')
        .insert([req])
        .select()
        .single()
      
      if (error) throw error

      setPendingRequest(data)
      setAmount('')
    } catch (err) {
      console.error('Error creating request:', err)
      alert(t('topup.alerts.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelRequest = async () => {
    if (!pendingRequest) return
    if (!window.confirm(t('topup.alerts.cancelConfirm'))) return
    
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'cancelled' })
        .eq('id', pendingRequest.id)
        
      if (error) throw error
      setPendingRequest(null)
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  const checkPayment = async () => {
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-payment', {
        method: 'POST',
      });
      
      if (error) throw error;
      
      if (data?.processed > 0) {
        alert(t('topup.alerts.processSuccess', { count: data.processed }));
        fetchHistory();
        fetchBankInfoAndPending();
        if (refreshProfile) refreshProfile();
      } else {
        alert(t('topup.alerts.noTransactionFound'));
      }
    } catch (err) {
      console.error('Check error:', err);
      alert(t('topup.alerts.checking'));
    } finally {
      setIsSubmitting(false)
    }
  }

  // VietQR URL builder (vietcombank) with fallback if DB info is missing
  const bankAccount = bankInfo?.account_number || '0000000000';
  const bankName = bankInfo?.account_name || 'CHUA CAI DAT TEN';
  
  const vietQrUrl = pendingRequest 
    ? `https://img.vietqr.io/image/vietcombank-${bankAccount}-compact2.png?amount=${pendingRequest?.expected_amount}&addInfo=${encodeURIComponent(pendingRequest?.deposit_code)}&accountName=${encodeURIComponent(bankName)}`
    : '';

  return (
    <div className="relative min-h-screen overflow-x-hidden cyber-gradient">
      <Header />

      <div className="fixed -top-24 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -left-20 w-96 h-96 rounded-full bg-neon-purple/10 blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold mb-2">{t('topup.pageSubtitle')}</p>
          <h1 className="text-4xl font-black tracking-tight">{t('topup.pageTitle')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form / Info */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t('topup.currentBalance')}</span>
                <span className="material-symbols-outlined text-primary text-lg">account_balance_wallet</span>
              </div>
              <p className="text-3xl font-black text-primary relative z-10">{formatVnd(profile?.balance, i18n.language)}</p>
            </div>

            <div className="glass-panel rounded-2xl relative overflow-hidden flex-1 border-slate-800 flex flex-col p-6">
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
               <h3 className="font-black text-lg text-white mb-6">{t('topup.createRequest')}</h3>
               <form onSubmit={handleCreateRequest} className="space-y-4 flex flex-col h-full">
                 <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-400 mb-1.5">{t('topup.amountLabel')}</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="10000"
                      step="10000"
                      className="w-full font-bold rounded-xl bg-[#0a0e14]/90 border border-slate-700/60 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                      placeholder={t('topup.amountPlaceholder')}
                    />
                 </div>
                 <div className="pt-2 text-xs text-slate-400 space-y-2">
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span> {t('topup.autoSupport')}</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span> {t('topup.qrSupport')}</div>
                 </div>
                 <div className="mt-auto pt-6">
                   <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-primary hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 font-bold tracking-wide transition-all neon-border-cyan flex justify-center items-center gap-2"
                    >
                      {isSubmitting ? <span className="material-symbols-outlined animate-spin">sync</span> : t('topup.generateQr')}
                    </button>
                 </div>
               </form>
            </div>
          </div>

          {/* Right Column: QR and History */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* View QR Code Panel */}
            {pendingRequest && (
              <div className="glass-panel rounded-2xl p-6 relative border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-black text-xl text-white mb-1">{t('topup.transferToTopup')}</h3>
                    <p className="text-xs text-slate-400">{t('topup.scanQrDesc')}</p>
                  </div>
                  <button onClick={cancelRequest} className="text-slate-500 hover:text-red-400 transition-colors" title={t('topup.cancelRequest')}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {vietQrUrl && (
                    <div className="bg-white p-2 rounded-xl shadow-[0_0_30px_rgba(0,195,255,0.2)] shrink-0 mx-auto md:mx-0">
                      <img src={vietQrUrl} alt="VietQR Code" className="w-56 h-56 object-contain rounded-lg" />
                    </div>
                  )}
                  
                  <div className="flex-1 w-full flex flex-col justify-between h-full space-y-4">
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 text-sm space-y-3">
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">{t('topup.bankName')}:</span>
                        <span className="font-bold text-white">Vietcombank</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">{t('topup.accountNumber')}:</span>
                        <span className="font-bold text-white tracking-widest">{bankInfo?.account_number || t('admin.bank.notUpdated')}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">{t('topup.accountName')}:</span>
                        <span className="font-bold text-white uppercase">{bankInfo?.account_name || t('common.error')}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">{t('topup.amount')}:</span>
                        <span className="font-black text-primary">{formatVnd(pendingRequest.expected_amount, i18n.language)}</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-slate-400">{t('topup.content')}:</span>
                        <span className="font-black text-neon-purple tracking-widest bg-neon-purple/20 px-2 rounded-md">{pendingRequest.deposit_code}</span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-red-400 italic text-center md:text-left">
                      {t('topup.mandatoryContent')}
                    </p>

                    <button
                       onClick={checkPayment}
                       disabled={isSubmitting}
                       className="w-full bg-primary hover:bg-blue-500 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold tracking-wide transition-all neon-border-cyan flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(37,123,244,0.3)] mt-2"
                     >
                       {isSubmitting ? <span className="material-symbols-outlined animate-spin">sync</span> : t('topup.confirmSuccess')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Panel */}
            <div className="glass-panel rounded-2xl relative overflow-hidden flex-1">
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent" />
               <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-400">history</span>
                    <h2 className="text-lg font-black tracking-tight">{t('topup.historyTitle')}</h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{t('topup.historyTotal')}: {formatVnd(totalTopup, i18n.language)}</span>
               </div>
               
               <div className="p-0">
                  {loadingHistory ? (
                    <div className="flex justify-center items-center py-16 text-primary">
                      <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-5">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-600">receipt_long</span>
                      </div>
                      <p className="text-slate-400 text-sm">{t('topup.noHistory')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors">
                           <div className="flex items-center gap-4">
                             <div className="size-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                               <span className="material-symbols-outlined">payments</span>
                             </div>
                             <div>
                               <p className="font-bold text-white text-sm">{t('topup.walletTopup')}</p>
                               <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="font-black text-green-400">+{formatVnd(tx.amount, i18n.language)}</p>
                             {tx.status && (
                               <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5
                                 ${tx.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                                   tx.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 
                                   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                                 {t(`common.status.${tx.status}`)}
                               </span>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

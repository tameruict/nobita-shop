import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLES = {
  completed: 'bg-green-500/15 text-green-400 border border-green-500/30',
  paid: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  processing: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  pending: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  awaiting_payment: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount ?? 0) + ' ₫'
}

function StatusBadge({ status }) {
  const className = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()

  const [orders, setOrders] = useState([])
  const [totalTopup, setTotalTopup] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)

  const userId = session?.user?.id

  const fetchOrders = useCallback(async () => {
    if (!userId) return
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          total_amount,
          status,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            line_total,
            products ( name )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data ?? [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [userId])

  const fetchWalletSummary = useCallback(async () => {
    if (!userId) return
    setLoadingWallet(true)
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('type, amount')
        .eq('user_id', userId)

      if (error) throw error

      const txns = data ?? []
      let topup = 0
      let spent = 0

      txns.forEach(tx => {
        if (tx.type === 'deposit') topup += tx.amount || 0
        if (tx.type === 'purchase') spent += Math.abs(tx.amount || 0)
      })

      setTotalTopup(topup)
      setTotalSpent(spent)
    } catch (err) {
      console.error('Error fetching wallet transactions:', err)
    } finally {
      setLoadingWallet(false)
    }
  }, [userId])

  useEffect(() => {
    fetchOrders()
    fetchWalletSummary()
  }, [fetchOrders, fetchWalletSummary])

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const avatarLetter = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="relative min-h-screen overflow-x-hidden cyber-gradient">
      <Header />

      {/* Background decorations */}
      <div className="fixed -top-24 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -left-20 w-96 h-96 rounded-full bg-neon-purple/10 blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        {/* Page Title */}
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold mb-2">
            {t('profile.pageSubtitle', 'My Account')}
          </p>
          <h1 className="text-4xl font-black tracking-tight">
            {t('profile.pageTitle', 'Profile')}
          </h1>
        </div>

        {/* Profile Card + Balance row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Identity card */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden lg:col-span-1">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 neon-border-cyan flex items-center justify-center text-2xl font-black text-primary">
                {avatarLetter}
              </div>
              <div className="min-w-0">
                <p className="font-black text-lg text-white truncate">{profile?.full_name || 'No Name'}</p>
                <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mt-2">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-base">calendar_month</span>
                <span>Joined {joinDate}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-base">badge</span>
                <span className="capitalize">Role: <span className={profile?.role === 'admin' ? 'text-primary font-bold' : 'text-slate-300'}>{profile?.role || 'user'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-green-400">fiber_manual_record</span>
                <span className="text-green-400 text-xs font-bold uppercase">Active</span>
              </div>
            </div>
          </div>

          {/* Balance stats — 3 cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Balance */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-primary/10 to-transparent blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Balance</span>
                <span className="material-symbols-outlined text-primary text-lg">account_balance_wallet</span>
              </div>
              <p className="text-2xl font-black text-primary relative z-10">{formatVnd(profile?.balance)}</p>
            </div>

            {/* Total Topped Up */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-green-500/10 to-transparent blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Topped Up</span>
                <span className="material-symbols-outlined text-green-400 text-lg">trending_up</span>
              </div>
              {loadingWallet ? (
                <div className="h-8 w-24 rounded-lg bg-slate-700/50 animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-green-400 relative z-10">{formatVnd(totalTopup)}</p>
              )}
            </div>

            {/* Total Spent */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-neon-purple/10 to-transparent blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Spent</span>
                <span className="material-symbols-outlined text-neon-purple text-lg">shopping_bag</span>
              </div>
              {loadingWallet ? (
                <div className="h-8 w-24 rounded-lg bg-slate-700/50 animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-neon-purple relative z-10">{formatVnd(totalSpent)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="glass-panel rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

          <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-neon-purple">receipt_long</span>
              <h2 className="text-lg font-black tracking-tight">
                {t('profile.orderHistory', 'Order History')}
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          </div>

          {loadingOrders ? (
            <div className="flex flex-col items-center py-16 gap-4 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
              <p className="text-sm text-slate-400">Loading orders…</p>
            </div>
          ) : orders.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center py-20 gap-5">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-slate-600">shopping_cart</span>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-1">{t('profile.noOrders', 'No orders yet')}</p>
                <p className="text-slate-400 text-sm">Your purchase history will appear here.</p>
              </div>
              <Link
                to="/#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/80 neon-border-cyan transition-all text-sm"
              >
                <span className="material-symbols-outlined text-base">storefront</span>
                Browse Plans
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {orders.map(order => {
                const isExpanded = expandedOrder === order.id
                return (
                  <div key={order.id}>
                    {/* Order row */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-5 hover:bg-slate-800/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-base">receipt</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm font-mono">{order.order_code}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto">
                        <StatusBadge status={order.status} />
                        <p className="font-black text-primary text-sm">{formatVnd(order.total_amount)}</p>
                        <span className={`material-symbols-outlined text-slate-400 text-base transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div className="px-6 pb-5 bg-slate-900/40">
                        <div className="border border-slate-700/40 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-400 font-bold grid grid-cols-12">
                            <span className="col-span-6">Product</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-right">Unit Price</span>
                            <span className="col-span-2 text-right">Total</span>
                          </div>
                          {(order.order_items ?? []).map(item => (
                            <div key={item.id} className="px-4 py-3 grid grid-cols-12 text-sm border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <span className="col-span-6 text-white font-medium truncate pr-3">{item.products?.name || '—'}</span>
                              <span className="col-span-2 text-center text-slate-300">{item.quantity}</span>
                              <span className="col-span-2 text-right text-slate-300 font-mono text-xs">{formatVnd(item.unit_price)}</span>
                              <span className="col-span-2 text-right text-primary font-bold font-mono text-xs">{formatVnd(item.line_total)}</span>
                            </div>
                          ))}
                          {(order.order_items ?? []).length === 0 && (
                            <div className="px-4 py-4 text-center text-slate-500 text-sm">No items recorded.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

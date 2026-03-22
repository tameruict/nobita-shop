import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();



  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [revenueData, setRevenueData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch paid/completed orders — use FK hint for the join
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_amount, created_at, status, profiles!orders_user_id_fkey(full_name, email)')
          .in('status', ['paid', 'completed'])
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Orders fetch error:', ordersError);
        }

        const safeOrders = orders ?? [];

        // Calculate total revenue
        const total = safeOrders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
        setTotalRevenue(total);

        // Recent 5 transactions
        const recent = safeOrders.slice(0, 5).map(o => ({
          id: o.id,
          user: o.profiles?.full_name || o.profiles?.email || 'Unknown',
          amount: o.total_amount,
          date: new Date(o.created_at).toLocaleDateString(),
        }));
        setRecentTransactions(recent);

        // Revenue chart grouped by day of week
        const revenueByDay = {};
        safeOrders.forEach(order => {
          const day = new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          revenueByDay[day] = (revenueByDay[day] || 0) + (order.total_amount || 0);
        });

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setRevenueData(days.map(day => ({ name: day, revenue: revenueByDay[day] || 0 })));

        // Active user count — use is_active filter (admin can see all with correct RLS)
        const { count, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!usersError) setActiveUsers(count || 0);

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-primary/20">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto relative z-10 w-full">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>

        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Revenue Overview</h1>
            <p className="text-slate-400 text-sm">Welcome back. Live data connected to Supabase.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
              <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Revenue</span>
                  <span className="material-symbols-outlined text-green-400">trending_up</span>
                </div>
                <span className="text-4xl font-black relative z-10">
                  {new Intl.NumberFormat('vi-VN').format(totalRevenue)} ₫
                </span>
              </div>

              <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-neon-purple/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Users</span>
                  <span className="material-symbols-outlined text-neon-purple">subscriptions</span>
                </div>
                <span className="text-4xl font-black relative z-10">{activeUsers}</span>
              </div>

              <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-neon-cyan/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">System Status</span>
                  <span className="material-symbols-outlined text-neon-cyan">dns</span>
                </div>
                <span className="text-4xl font-black relative z-10 text-neon-cyan">ONLINE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
              {/* Chart */}
              <div className="glass-panel p-6 rounded-2xl border-slate-800 lg:col-span-2 relative z-10">
                <h3 className="text-lg font-bold mb-6">Revenue Trend (This Week)</h3>
                <div className="w-full relative" style={{ height: '300px' }}>
                  <ResponsiveContainer width="99%" height="100%" debounce={1}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#00f3ff' }}
                        formatter={(val) => [`${new Intl.NumberFormat('vi-VN').format(val)} ₫`, 'Revenue']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#257bf4" strokeWidth={3} dot={{ fill: '#0a0e14', stroke: '#00f3ff', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="glass-panel p-6 rounded-2xl border-slate-800 relative z-10">
                <h3 className="text-lg font-bold mb-6">Recent Completed Orders</h3>
                <div className="space-y-4">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-primary uppercase">
                          {tx.user.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm truncate max-w-[120px]">{tx.user}</p>
                          <p className="text-xs text-slate-400">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400 text-sm">+{new Intl.NumberFormat('vi-VN').format(tx.amount)} ₫</p>
                      </div>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <div className="flex flex-col items-center py-8 gap-3 text-slate-500">
                      <span className="material-symbols-outlined text-4xl">receipt_long</span>
                      <p className="text-sm">No completed orders yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

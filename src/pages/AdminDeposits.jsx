import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount ?? 0) + ' ₫';
}

export default function AdminDeposits() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasStatusColumn, setHasStatusColumn] = useState(true);

  // KPIs
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0 });



  const fetchDeposits = async () => {
    try {
      setLoading(true);
      // Try to fetch with profiles join
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          id, 
          user_id, 
          amount, 
          type, 
          created_at, 
          status,
          profiles!wallet_transactions_user_id_fkey(full_name, email)
        `)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false });
        
      if (error) {
        // Fallback for schema matching (if status missing or fk missing)
        if (error.code === 'PGRST200' || error.message.includes('status')) {
           setHasStatusColumn(false);
           const { data: fallbackData } = await supabase
             .from('wallet_transactions')
             .select('id, user_id, amount, type, created_at, profiles!wallet_transactions_user_id_fkey(full_name, email)')
             .eq('type', 'deposit')
             .order('created_at', { ascending: false });
           setDeposits(fallbackData || []);
        } else {
           throw error;
        }
      } else {
        setDeposits(data || []);
      }
    } catch (error) {
       console.error('Error fetching deposits:', error);
       // Try absolute fallback without profiles
       const { data: bareData } = await supabase
         .from('wallet_transactions')
         .select('*')
         .eq('type', 'deposit')
         .order('created_at', { ascending: false });
       setDeposits(bareData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  useEffect(() => {
    // Calculate stats
    const todayStr = new Date().toLocaleDateString();
    let todayAmt = 0;
    let pend = 0;
    let comp = 0;
    
    deposits.forEach(d => {
       if (new Date(d.created_at).toLocaleDateString() === todayStr) {
         todayAmt += d.amount || 0;
       }
       if (d.status === 'pending') pend++;
       if (d.status === 'completed' || (!d.status && hasStatusColumn===false)) comp++;
    });
    setStats({ today: todayAmt, pending: pend, completed: comp });
  }, [deposits, hasStatusColumn]);

  const updateStatus = async (id, newStatus, currentAmount, userId) => {
    if (!window.confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;
    try {
      // 1. Update status
      const { error: updError } = await supabase
        .from('wallet_transactions')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (updError) throw updError;

      // 2. If approved, update user balance
      if (newStatus === 'completed') {
         // Need to call a secure RPC or update profile. Note: Admin should have RLS bypass, 
         // but profile update might require RPC for atomic increment. 
         // For now, we attempt a direct update, assuming admin can update profiles.
         const { data: userProf } = await supabase.from('profiles').select('balance').eq('id', userId).single();
         if (userProf) {
            const newBal = (userProf.balance || 0) + currentAmount;
            await supabase.from('profiles').update({ balance: newBal }).eq('id', userId);
         }
      }

      setDeposits(deposits.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const filteredDeposits = deposits.filter(d => {
    const term = searchTerm.toLowerCase();
    const searchString = `${d.id} ${d.profiles?.full_name || ''} ${d.profiles?.email || ''}`.toLowerCase();
    return searchString.includes(term);
  });

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-green-500/20">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto relative z-10 w-full overflow-x-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>
        
        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Deposit Management</h1>
            <p className="text-slate-400 text-sm">Review incoming cash flow and approve requests.</p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
          <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
             <div className="absolute -inset-4 bg-gradient-to-tr from-green-500/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex items-center justify-between relative z-10">
               <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Today's Inflow</span>
               <span className="material-symbols-outlined text-green-400">today</span>
             </div>
             <span className="text-4xl font-black relative z-10 text-green-400">
               {formatVnd(stats.today)}
             </span>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
             <div className="flex items-center justify-between relative z-10">
               <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Pending</span>
               <span className="material-symbols-outlined text-yellow-400">pending_actions</span>
             </div>
             <span className="text-4xl font-black relative z-10 text-yellow-400">{stats.pending}</span>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
             <div className="flex items-center justify-between relative z-10">
               <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Completed</span>
               <span className="material-symbols-outlined text-primary">task_alt</span>
             </div>
             <span className="text-4xl font-black relative z-10 text-primary">{stats.completed}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border-slate-800 relative z-10 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 gap-4">
            <div className="relative w-full sm:w-64">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
               <input 
                 type="text" 
                 placeholder="Search user or email..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-white placeholder-slate-500"
               />
            </div>
            {!hasStatusColumn && (
               <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                 Note: 'status' column not found in DB. Read-only mode.
               </span>
            )}
            <button onClick={fetchDeposits} className="p-2 text-slate-400 hover:text-white transition-colors" title="Refresh">
               <span className="material-symbols-outlined block text-[20px] {loading ? 'animate-spin' : ''}">refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
               <div className="flex justify-center items-center h-40 text-green-500">
                 <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
               </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-xs uppercase bg-slate-800/40 text-slate-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredDeposits.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs uppercase">
                             {d.profiles?.full_name?.charAt(0) || d.profiles?.email?.charAt(0) || '?'}
                           </div>
                           <div>
                             <p className="font-bold text-white max-w-[150px] truncate">{d.profiles?.full_name || 'No Name'}</p>
                             <p className="text-xs text-slate-500 max-w-[150px] truncate">{d.profiles?.email || d.user_id?.split('-')[0]}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-green-400">
                        {formatVnd(d.amount)}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {d.status ? (
                          <span className={`px-2 py-1 flex w-fit items-center gap-1 rounded text-[10px] font-bold uppercase tracking-wider border
                            ${d.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                              d.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 
                              'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}
                          >
                            {d.status}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">No Status</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasStatusColumn && d.status === 'pending' ? (
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={() => updateStatus(d.id, 'completed', d.amount, d.user_id)} className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                               Approve
                             </button>
                             <button onClick={() => updateStatus(d.id, 'rejected', d.amount, d.user_id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                               Reject
                             </button>
                           </div>
                        ) : (
                           <span className="text-slate-600 text-xs italic">Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDeposits.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No deposits found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

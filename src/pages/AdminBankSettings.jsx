import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminBankSettings() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });



  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_setting')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 0 rows returned
      
      if (data) {
        setAccountName(data.account_name || '');
        setAccountNumber(data.account_number || '');
        setApiToken(data.api_token || '');
        if (data.updated_at) {
          setLastUpdated(new Date(data.updated_at).toLocaleString('vi-VN'));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMsg({ type: 'error', text: 'Không thể tải cấu hình.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('bank_setting')
        .upsert({ 
          id: 1, 
          account_name: accountName,
          account_number: accountNumber,
          api_token: apiToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
        
      if (error) throw error;
      
      setMsg({ type: 'success', text: 'Lưu cấu hình thành công!' });
      fetchSettings(); // Refresh timestamp
    } catch (error) {
      console.error('Save error:', error);
      setMsg({ type: 'error', text: 'Lỗi khi lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-blue-500/20">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto relative z-10 w-full">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>
        
        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
             <h1 className="text-3xl font-black tracking-tight mb-2">Thông Tin Tài Khoản VIETIN BANK</h1>
             <p className="text-slate-400 text-sm">Tổng quan &gt; Danh Sách Tài Khoản &gt; <span className="text-blue-400">Cấu hình API</span></p>
          </div>
        </header>

        <div className="max-w-2xl glass-panel p-8 rounded-2xl border-slate-800 relative z-10">
           {loading ? (
             <div className="flex justify-center items-center h-40 text-blue-500">
               <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
             </div>
           ) : (
             <form onSubmit={handleSave} className="space-y-6">
                
                {msg.text && (
                  <div className={`p-4 rounded-xl text-sm font-bold border ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                    {msg.text}
                  </div>
                )}

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-2">Tên tài khoản VIETIN BANK:</label>
                   <input
                     type="text"
                     value={accountName}
                     onChange={(e) => setAccountName(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                     placeholder="Ví dụ: NGUYEN VAN A"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-2">Số tài khoản VIETIN BANK:</label>
                   <input
                     type="text"
                     value={accountNumber}
                     onChange={(e) => setAccountNumber(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                     placeholder="Ví dụ: 107882860742"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-2">Token API:</label>
                   <div className="flex relative">
                     <input
                       type="text"
                       value={apiToken}
                       onChange={(e) => setApiToken(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-700/60 rounded-l-xl rounded-r-none px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                       placeholder="Nhập Token API (thueapibank.vn)"
                     />
                     <button type="button" className="bg-green-600 hover:bg-green-500 px-4 rounded-r-xl flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-white text-lg">content_copy</span>
                     </button>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-2">Cập nhật lần cuối:</label>
                   <div className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-400">
                     {lastUpdated || 'Chưa cập nhật'}
                   </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-pink-500 hover:bg-pink-400 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Lưu Cấu Hình'}
                  </button>
                  <Link to="/admin" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all text-center border border-slate-700">
                     Quay lại
                  </Link>
                </div>

             </form>
           )}
        </div>
      </main>
    </div>
  );
}

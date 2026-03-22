import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', color: 'slate' },
    { path: '/admin/users', label: 'Users', icon: 'group', color: 'slate' },
    { path: '/admin/products', label: 'Products', icon: 'inventory_2', color: 'blue' },
    { path: '/admin/orders', label: 'Orders', icon: 'shopping_cart', color: 'pink' },
    { path: '/admin/deposits', label: 'Deposits', icon: 'payments', color: 'green' },
    { path: '/admin/bank-settings', label: 'Bank API', icon: 'account_balance', color: 'blue' },
  ];

  const isActive = (path) => location.pathname === path;

  const getColorClasses = (item) => {
    if (!isActive(item.path)) return 'text-slate-400 hover:text-white hover:bg-slate-800/50';
    
    switch (item.color) {
      case 'blue': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold';
      case 'green': return 'bg-green-500/20 text-green-400 border border-green-500/30 font-bold';
      case 'pink': return 'bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold';
      default: return 'bg-slate-700/50 text-white border border-slate-600/50 font-bold';
    }
  };

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 min-h-screen p-6 flex flex-col gap-8 flex-shrink-0 z-20 relative">
      <Link to="/" className="flex items-center gap-3">
        <div className="size-8 text-primary bg-primary/10 rounded-lg flex items-center justify-center neon-border-cyan">
          <span className="material-symbols-outlined text-sm">bolt</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Admin<span className="text-primary">Panel</span></h2>
      </Link>

      {profile && (
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
          <p className="text-white font-semibold truncate">{profile.full_name || 'Admin'}</p>
          <p className="truncate">{profile.email}</p>
        </div>
      )}

      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${getColorClasses(item)}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-all"
      >
        <span className="material-symbols-outlined">logout</span>
        Logout
      </button>
    </aside>
  );
}

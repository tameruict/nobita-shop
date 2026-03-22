import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut();
    navigate('/login');
  };
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (id, currentIsActive) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentIsActive })
        .eq('id', id);
        
      if (error) throw error;
      setUsers(users.map(u => 
        u.id === id ? { ...u, is_active: !currentIsActive } : u
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const toggleRole = async (id, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id);
        
      if (error) throw error;
      setUsers(users.map(u => 
        u.id === id ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      // In Supabase, usually deleting a user from `profiles` might trigger error if foreign keys exist,
      // or it might automatically delete if ON DELETE CASCADE is set for `auth.users`, but we can only 
      // delete `profiles` directly if we have permission.
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Cannot delete user. It may be linked to existing transactions.');
    }
  };

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-neon-purple/20">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 min-h-screen p-6 flex flex-col gap-8">
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
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 bg-neon-purple/20 text-neon-purple rounded-xl font-bold transition-all neon-border-purple">
            <span className="material-symbols-outlined">group</span>
            Users
          </Link>
          <Link to="/admin/deposits" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-all">
            <span className="material-symbols-outlined">payments</span>
            Deposits
          </Link>
        </nav>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-all">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </aside>


      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto relative z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>
        
        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">User Management</h1>
            <p className="text-slate-400 text-sm">Create, edit, and manage system accounts</p>
          </div>
          <button className="bg-primary text-white px-4 py-2 font-bold rounded-lg flex items-center gap-2 neon-border-cyan hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add User
          </button>
        </header>

        <div className="glass-panel rounded-2xl border-slate-800 relative z-10 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-white placeholder-slate-500"
              />
            </div>
            <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-white transition-colors" title="Refresh">
              <span className="material-symbols-outlined block text-[20px] {loading ? 'animate-spin' : ''}">refresh</span>
            </button>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
               <div className="flex justify-center items-center h-40 text-neon-purple">
                 <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
               </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase bg-slate-800/40 text-slate-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs uppercase">
                             {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                           </div>
                           <div>
                             <p className="font-bold text-white">{user.full_name || 'No Name'}</p>
                             <p className="text-xs text-slate-500">{user.email}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <button onClick={() => toggleRole(user.id, user.role)} className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                           {user.role}
                         </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="capitalize">{user.is_active ? 'Active' : 'Disabled'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-slate-400 hover:text-white transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => toggleStatus(user.id, user.is_active)} className="text-slate-400 hover:text-yellow-400 transition-colors" title={user.is_active ? 'Deactivate' : 'Activate'}>
                             <span className="material-symbols-outlined text-[18px]">{user.is_active ? 'block' : 'check_circle'}</span>
                          </button>
                          <button onClick={() => deleteUser(user.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No users found.</td>
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

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (full_name, email, balance, chatgpt_gmail),
          products:product_id (name, price, delivery_type)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async (order) => {
    if (!window.confirm(`Approve order for ${order.profiles?.full_name}?`)) return;

    try {
      // 1. Check user balance
      if (order.profiles.balance < order.amount) {
        alert("User does not have enough balance!");
        return;
      }

      const deliveryType = order.products?.delivery_type || 'auto';

      let deliveredContent = 'Service Activated automatically by admin';
      
      if (deliveryType === 'auto') {
        const { data: items, error: itemError } = await supabase
          .from('product_items')
          .select('*')
          .eq('product_id', order.product_id)
          .eq('is_sold', false)
          .limit(1);

        if (itemError) throw itemError;

        if (items && items.length > 0) {
          const item = items[0];
          deliveredContent = item.content;
          
          await supabase.from('product_items').update({ is_sold: true }).eq('id', item.id);
          const { data: prod } = await supabase.from('products').select('stock_count').eq('id', order.product_id).single();
          if (prod) {
             await supabase.from('products').update({ stock_count: Math.max(0, prod.stock_count - 1) }).eq('id', order.product_id);
          }
        } else {
           alert("No items in stock for this product!");
           return;
        }
      } else {
        // Manual (e.g. GPT Business)
        deliveredContent = `Quyền truy cập đã được cấp cho Gmail: ${order.profiles.chatgpt_gmail || 'Không rõ'}`;
      }

      // 3. Deduct balance
      const newBalance = order.profiles.balance - order.amount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', order.user_id);
      
      if (balanceError) throw balanceError;

      // 4. Complete order
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          extra_info: order.extra_info,
          delivery_data: deliveredContent
        })
        .eq('id', order.id);

      if (orderUpdateError) throw orderUpdateError;

      alert("Order Approved & Fulfilled!");
      fetchOrders();
    } catch (err) {
      alert("Approval error: " + err.message);
    }
  };

  const handleReject = async (id) => {
     if (!window.confirm("Reject this order?")) return;
     await supabase.from('orders').update({ status: 'rejected' }).eq('id', id);
     fetchOrders();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-pink-500/20">
      <AdminSidebar />

      <main className="flex-1 p-10 overflow-y-auto relative z-10 w-full">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>

        <header className="mb-10 relative z-10">
          <h1 className="text-3xl font-black tracking-tight mb-2">Order Management</h1>
          <p className="text-slate-400 text-sm">Review and approve customer purchases.</p>
        </header>

        <div className="glass-panel rounded-2xl border-slate-800 relative z-10 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-pink-500">
                <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase bg-slate-800/40 text-slate-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Delivery</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Details/Gmail</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{order.profiles?.full_name}</p>
                        <p className="text-xs text-slate-500">{order.profiles?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-200">{order.products?.name}</span>
                      </td>
                      <td className="px-6 py-4 font-black text-primary">
                        {new Intl.NumberFormat('vi-VN').format(order.amount)} ₫
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${order.products?.delivery_type === 'manual' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                          {order.products?.delivery_type || 'auto'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {order.profiles?.chatgpt_gmail && (
                            <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded w-fit text-[11px] font-mono border border-cyan-500/20">
                              <span className="material-symbols-outlined text-[14px]">mail</span>
                              <span>{order.profiles.chatgpt_gmail}</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(order.profiles.chatgpt_gmail);
                                  alert('Đã copy Gmail: ' + order.profiles.chatgpt_gmail);
                                }}
                                className="hover:text-white transition-colors ml-1"
                                title="Copy Gmail"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            </div>
                          )}
                          <span className="text-slate-400 text-xs line-clamp-2 max-w-[200px]" title={order.extra_info}>
                            {order.extra_info || order.delivery_data || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {order.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleApprove(order)}
                              className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-green-500/30"
                            >
                               Approve
                            </button>
                            <button 
                              onClick={() => handleReject(order.id)}
                              className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-500/30"
                            >
                               Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No orders found.</td>
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

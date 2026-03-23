import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminSidebar from '../components/AdminSidebar';
import { useTranslation } from 'react-i18next';

export default function AdminProducts() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [importContent, setImportContent] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    delivery_type: 'auto',
    stock_count: 0,
    image_url: ''
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('products').insert([formData]);
      if (error) throw error;
      setShowAddModal(false);
      setFormData({ name: '', description: '', price: '', category: '', delivery_type: 'auto', stock_count: 0, image_url: '' });
      fetchProducts();
    } catch (err) {
      alert(t('admin.products.addError') + err.message);
    }
  };

  const handleImportItems = async (e) => {
    e.preventDefault();
    const lines = importContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    try {
      const items = lines.map(content => ({
        product_id: selectedProduct.id,
        content: content.trim(),
        is_sold: false
      }));

      const { error } = await supabase.from('product_items').insert(items);
      if (error) throw error;

      // Update stock count in products table
      const newStock = (selectedProduct.stock_count || 0) + items.length;
      await supabase.from('products').update({ stock_count: newStock }).eq('id', selectedProduct.id);

      alert(t('admin.products.importSuccess', { count: items.length }));
      setShowImportModal(false);
      setImportContent('');
      fetchProducts();
    } catch (err) {
      alert(t('admin.products.itemImportError') + err.message);
    }
  };

  const deleteProduct = async (id) => {
     if (!window.confirm(t('admin.products.deleteConfirm'))) return;
     await supabase.from('products').delete().eq('id', id);
     fetchProducts();
  }

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-display flex border-t border-blue-500/20">
      <AdminSidebar />
      
      <main className="flex-1 p-10 overflow-y-auto relative z-10 w-full">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed inset-0 cyber-grid pointer-events-none opacity-50"></div>

        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">{t('admin.products.title')}</h1>
            <p className="text-slate-400 text-sm">{t('admin.products.subtitle')}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-6 py-3 font-bold rounded-xl flex items-center gap-2 neon-border-cyan hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">add_box</span>
            {t('admin.products.addBtn')}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
          {loading ? (
             <div className="col-span-full flex justify-center py-20 text-primary">
                <span className="material-symbols-outlined animate-spin text-5xl">sync</span>
             </div>
          ) : products.map(p => (
            <div key={p.id} className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-4 relative group">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">
                    {p.category}
                  </div>
                  <div className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${p.delivery_type === 'manual' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                    {p.delivery_type === 'manual' ? t('admin.products.typeManual') : t('admin.products.typeAuto')}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => deleteProduct(p.id)} className="text-slate-500 hover:text-red-400">
                     <span className="material-symbols-outlined text-sm">delete</span>
                   </button>
                </div>
              </div>
              
              <div className="flex gap-4 items-center mt-2">
                 {p.image_url ? (
                   <img src={p.image_url} className="size-16 rounded-xl object-cover border border-slate-700" alt="" />
                 ) : (
                   <div className="size-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
                      <span className="material-symbols-outlined text-3xl">image</span>
                   </div>
                 )}
                 <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{p.name}</h3>
                    <p className="text-primary font-black text-xl mt-1">
                      {new Intl.NumberFormat('vi-VN').format(p.price)} ₫
                    </p>
                 </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                 <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">{t('admin.products.inStock')}</span>
                    <span className={`font-black ${p.stock_count > 0 ? 'text-green-400' : 'text-red-500'}`}>
                      {p.stock_count} {t('admin.products.units')}
                    </span>
                 </div>
                 <button 
                   onClick={() => { setSelectedProduct(p); setShowImportModal(true); }}
                   className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
                 >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    {t('admin.products.importBulk')}
                 </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
             <div className="glass-panel w-full max-w-md p-8 rounded-3xl border-slate-700 relative animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-black mb-6">{t('admin.products.newProduct')}</h2>
                <form onSubmit={handleAddProduct} className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.name')}</label>
                      <input 
                        type="text" required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary"
                      />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.price')}</label>
                        <input 
                          type="number" required
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.category')}</label>
                        <input 
                          type="text"
                          list="category-options"
                          required
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary"
                          placeholder={t('common.placeholder') + '...'}
                        />
                        <datalist id="category-options">
                           {Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(cat => (
                             <option key={cat} value={cat} />
                           ))}
                        </datalist>
                      </div>
                       <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.type')}</label>
                        <select
                          required
                          value={formData.delivery_type}
                          onChange={e => setFormData({...formData, delivery_type: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px] bg-[right_8px_center] bg-no-repeat"
                        >
                          <option value="auto">Auto ({t('admin.products.typeAuto')})</option>
                          <option value="manual">Manual ({t('admin.products.typeManual')})</option>
                        </select>
                      </div>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.description')}</label>
                      <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary min-h-[80px]"
                      />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">{t('admin.products.cancel')}</button>
                      <button type="submit" className="flex-1 bg-primary py-3 rounded-xl font-black text-white shadow-lg shadow-primary/20">{t('admin.products.create')}</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
             <div className="glass-panel w-full max-w-lg p-8 rounded-3xl border-slate-700 relative animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-black mb-2">{t('admin.products.importTitle')}</h2>
                <p className="text-slate-400 text-sm mb-6">{t('admin.products.importSubtitle')} <b>{selectedProduct?.name}</b></p>
                <form onSubmit={handleImportItems} className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('admin.products.importContent')}</label>
                      <textarea 
                        required
                        value={importContent}
                        onChange={e => setImportContent(e.target.value)}
                        placeholder="user1|pass1\nuser2|pass2..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary min-h-[200px] font-mono text-sm"
                      />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">{t('admin.products.cancel')}</button>
                      <button type="submit" className="flex-1 bg-green-600 py-3 rounded-xl font-black text-white shadow-lg shadow-green-500/20">{t('admin.products.importConfirm')}</button>
                   </div>
                </form>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}

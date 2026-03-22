import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount ?? 0) + ' ₫';
}

export default function PurchaseModal({ isOpen, onClose, product, profile }) {
  const [extraInfo, setExtraInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);

  if (!isOpen || !product) return null;

  const canAfford = (profile?.balance || 0) >= product.price;
  const deliveryType = product.delivery_type || 'auto';

  const handleConfirm = async () => {
    if (deliveryType === 'manual' && !profile?.chatgpt_gmail) {
      alert("Vui lòng cập nhật Gmail nhận quyền trong phần Hồ Sơ (Profile) trước khi mua hàng!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (deliveryType === 'auto') {
        const { data: items, error: itemError } = await supabase
          .from('product_items')
          .select('*')
          .eq('product_id', product.id)
          .eq('is_sold', false)
          .limit(1);

        if (itemError) throw itemError;
        if (!items || items.length === 0) {
          alert("Sản phẩm này hiện đang hết hàng. Vui lòng quay lại sau!");
          setIsSubmitting(false);
          return;
        }

        const item = items[0];

        // Deduct money
        const newBalance = profile.balance - product.price;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', profile.id);

        if (balanceError) throw balanceError;

        // Mark item sold & decrease stock
        await supabase.from('product_items').update({ is_sold: true }).eq('id', item.id);
        const newStock = Math.max(0, (product.stock_count || 1) - 1);
        await supabase.from('products').update({ stock_count: newStock }).eq('id', product.id);

        // Create completed order
        const { error: orderError } = await supabase.from('orders').insert([{
          user_id: profile.id,
          product_id: product.id,
          amount: product.price,
          status: 'completed',
          extra_info: 'Giao hàng tự động',
          delivery_data: item.content
        }]);

        if (orderError) throw orderError;

        setDeliveryData(item.content);
        setSuccess(true);
      } else {
        const { error } = await supabase.from('orders').insert([{
          user_id: profile.id,
          product_id: product.id,
          amount: product.price,
          status: 'pending',
          extra_info: `Gmail đăng ký: ${profile.chatgpt_gmail}`
        }]);

        if (error) throw error;
        setSuccess(true);
      }
    } catch (err) {
      alert("Lỗi khi tạo đơn hàng: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setExtraInfo('');
    setDeliveryData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-[#0f1115] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-bold text-white tracking-wide">Xác nhận mua hàng</h3>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="size-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto border border-green-500/30">
                <span className="material-symbols-outlined text-4xl">done_all</span>
              </div>
              {deliveryType === 'auto' && deliveryData ? (
                <>
                  <h2 className="text-2xl font-black text-white">Thanh toán thành công!</h2>
                  <div className="text-left mt-6">
                    <p className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Thông tin tài khoản của bạn:</p>
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl text-white font-mono text-sm whitespace-pre-wrap break-words">
                      {deliveryData}
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-4">
                    Thông tin này cũng đã được lưu vào Lịch sử mua hàng của bạn.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-white">Đã gửi yêu cầu!</h2>
                  <p className="text-slate-400 text-sm">
                    Đơn hàng của bạn đang chờ duyệt. Vui lòng kiểm tra lịch sử đơn hàng sau ít phút.
                  </p>
                </>
              )}
              <button 
                onClick={resetAndClose}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-black text-white">{product.name}</h4>
                  <p className="text-primary font-black text-lg">{formatVnd(product.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Số dư của bạn</p>
                  <p className={`font-black ${canAfford ? 'text-green-400' : 'text-red-500'}`}>
                    {formatVnd(profile?.balance)}
                  </p>
                </div>
              </div>

              {deliveryType === 'manual' && (
                <div className="space-y-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gmail nhận quyền</span>
                  {profile?.chatgpt_gmail ? (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-400">check_circle</span>
                      <span className="text-white font-bold text-sm tracking-wide">{profile.chatgpt_gmail}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <span className="material-symbols-outlined">warning</span>
                        <span>Bạn chưa cấu hình Gmail cung cấp dịch vụ.</span>
                      </div>
                      <Link 
                        to="/profile" 
                        onClick={() => onClose()}
                        className="w-full text-center py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm transition-colors border border-slate-600"
                      >
                        Đến trang Cấu hình
                      </Link>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    * Sản phẩm này cần Admin cấp quyền thủ công (tối đa 24h). Vui lòng đảm bảo bạn đã cấu hình đúng Gmail ở trang Profile.
                  </p>
                </div>
              )}

              {!canAfford ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
                    <span className="material-symbols-outlined">warning</span>
                    Bạn không đủ số dư để mua sản phẩm này.
                  </div>
                  <Link 
                    to="/topup"
                    className="block w-full text-center py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Nạp tiền ngay
                  </Link>
                </div>
              ) : (
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

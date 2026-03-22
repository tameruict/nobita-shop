import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase, hasSupabaseConfig } from '../lib/supabase';

const EXCHANGE_RATE_VND_TO_USD = 25000;

const pricingPlans = [
  {
    id: 'business-slot',
    name: 'Business',
    priceVnd: 40000,
    unitLabel: 'slot',
    warranty: 'No warranty',
    isFeatured: false,
    notes: ['1 slot', 'Monthly package'],
  },
  {
    id: 'admin-business-no-warranty',
    name: 'Admin Business',
    priceVnd: 70000,
    unitLabel: 'slot',
    warranty: 'No warranty',
    isFeatured: false,
    notes: ['Add up to 5 members', 'Monthly package'],
  },
  {
    id: 'admin-business-warranty',
    name: 'Admin Business',
    priceVnd: 90000,
    unitLabel: 'slot',
    warranty: 'Warranty included',
    isFeatured: true,
    notes: ['Add up to 5 members', 'Monthly package'],
  },
  {
    id: 'chatgpt-plus-no-warranty',
    name: 'ChatGPT Plus',
    priceVnd: 50000,
    unitLabel: 'account',
    warranty: 'No warranty',
    isFeatured: false,
    notes: ['1 account', 'Monthly package'],
  },
  {
    id: 'chatgpt-plus-warranty',
    name: 'ChatGPT Plus',
    priceVnd: 80000,
    unitLabel: 'account',
    warranty: 'Warranty included',
    isFeatured: false,
    notes: ['1 account', 'Monthly package'],
  },
];

function formatPrice(priceVnd, currency) {
  if (currency === 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceVnd / EXCHANGE_RATE_VND_TO_USD);
  }

  return `${new Intl.NumberFormat('vi-VN').format(priceVnd)} VND`;
}

function getPlanPlacementClass(index, totalPlans) {
  const mdRemainder = totalPlans % 2;
  const xlRemainder = totalPlans % 3;

  if (mdRemainder === 1 && index === totalPlans - 1) {
    return 'md:col-start-2';
  }

  if (xlRemainder === 1 && index === totalPlans - 1) {
    return 'xl:col-start-3';
  }

  if (xlRemainder === 2 && index === totalPlans - 2) {
    return 'xl:col-start-2';
  }

  return '';
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState('vnd');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      if (!hasSupabaseConfig) {
        if (isMounted) {
          setProducts(pricingPlans);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedProducts = data.map((p) => ({
            id: p.id,
            name: p.name,
            priceVnd: p.price,
            unitLabel: p.product_type === 'sharing_account' ? 'slot' : 'account',
            warranty: String(p.slug || '').includes('no-warranty') ? 'No warranty' : 'Warranty included',
            isFeatured: p.slug === 'admin-business-5-slots-warranty',
            notes: p.short_description
              ? p.short_description.split(',').map((s) => s.trim()).filter(Boolean)
              : ['Monthly package'],
          }));

          if (isMounted) {
            setProducts(formattedProducts);
          }
        } else {
          if (isMounted) {
            setProducts(pricingPlans);
          }
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        if (isMounted) {
          setProducts(pricingPlans);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden cyber-gradient">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 lg:px-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white">
              {t('hero.title1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-purple">premium</span> {t('hero.title2')}
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a href="#pricing" className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
                {t('hero.seePricing')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
              <button className="px-8 py-4 glass text-white font-bold rounded-xl hover:bg-white/5 transition-colors border border-white/20">
                {t('hero.buyNow')}
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-neon-purple/20 blur-3xl rounded-full"></div>
            <div className="relative glass rounded-2xl p-4 neon-border-purple overflow-hidden">
              <div className="bg-[#0f1115] rounded-xl overflow-hidden border border-white/5">
                <img className="w-full h-auto opacity-80" alt="Futuristic AI dashboard mockup with neon accents" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXCVr5qfL50XbKy7rNsvEw5Q84DT83puRZpRwThQX3kc8k4W5A-H8WtJ45Np_b9Bn-lTfsHdZeiQ85Iry7cTrpvZvlgcHL2J8nE0jcjaeQOnjdsv1KMsvDceUgkjUdAjXJOeIexWluBnuQ0wDCf7bJB2nPZCe68TjxsUGmc0HTscTGsQlAOPurFM77DZ4B_mvgaJbY4tq3EFYgKZ-1z6hBvbYjAqumjAb3gxsf3KjxNMh2-9ovgGgSEH6gUTTPixpoeyGJ6J-PVcQ"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent"></div>
              </div>
              <div className="absolute bottom-8 left-8 right-8 glass p-4 rounded-xl neon-border-cyan flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-neon-cyan">verified_user</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="text-sm font-bold text-white uppercase tracking-wider">Account Active</p>
                  </div>
                </div>
                <span className="text-neon-cyan text-xs font-mono font-bold">1ms RESPONSE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 lg:px-20 max-w-7xl mx-auto relative" id="pricing">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
            Business <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-slate-400 mb-6">
            All prices are monthly packages.
          </p>

          <div className="inline-flex glass rounded-xl border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setCurrency('vnd')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                currency === 'vnd'
                  ? 'bg-primary text-white neon-border-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              VND
            </button>
            <button
              type="button"
              onClick={() => setCurrency('usd')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                currency === 'usd'
                  ? 'bg-primary text-white neon-border-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6 items-stretch">
          {loading ? (
            <div className="col-span-full py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : (
            products.map((plan, index) => (
              <article
                key={plan.id}
                className={`glass p-7 rounded-3xl flex flex-col relative overflow-hidden border transition-transform hover:-translate-y-1 md:col-span-2 xl:col-span-2 ${
                  getPlanPlacementClass(index, products.length)
                } ${
                plan.isFeatured
                  ? 'neon-border-purple bg-primary/10 border-neon-purple/40'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              {plan.isFeatured && (
                <span className="absolute top-0 right-0 bg-neon-purple text-white text-[10px] font-black px-4 py-1 rounded-bl-xl tracking-tighter uppercase">
                  {i18n.language === 'vi' ? 'Khuyên dùng' : 'Recommended'}
                </span>
              )}

              <h4 className="text-white font-black text-lg tracking-tight mb-1">{plan.name}</h4>
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-4">
                {plan.warranty === 'No warranty' && i18n.language === 'vi' ? 'Không bảo hành' : plan.warranty}
              </p>

              <div className="mb-5">
                <p className="text-3xl font-black text-primary leading-none">
                  {formatPrice(plan.priceVnd, currency)}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  /1 {plan.unitLabel} {i18n.language === 'vi' ? '/tháng' : '/month'}
                </p>
              </div>

              <ul className="space-y-3 mb-7 flex-1">
                {plan.notes.map((note) => (
                  <li key={note} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                    {note}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => navigate(`/topup?amount=${plan.priceVnd}`)}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:scale-[1.02] transition-all neon-border-cyan"
              >
                {i18n.language === 'vi' ? 'Mua ngay' : 'Buy Monthly Plan'}
              </button>
            </article>
            ))
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

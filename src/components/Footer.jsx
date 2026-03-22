import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-20 glass border-t border-white/10 py-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">bolt</span>
            </div>
            <span className="text-xl font-bold text-white">Nobita AI</span>
          </div>
          <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
            {t('footer.description')}
          </p>
          <div className="flex gap-4">
            <Link className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/20 transition-all text-slate-300" to="#">
              <span className="material-symbols-outlined text-lg">send</span>
            </Link>
            <Link className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/20 transition-all text-slate-300" to="#">
              <span className="material-symbols-outlined text-lg">chat_bubble</span>
            </Link>
            <Link className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/20 transition-all text-slate-300" to="#">
              <span className="material-symbols-outlined text-lg">public</span>
            </Link>
          </div>
        </div>
        <div>
          <h5 className="text-white font-bold mb-6">{t('footer.quickLinks')}</h5>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><Link className="hover:text-primary transition-colors" to="#">{t('nav.pricing')} Details</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">API Documentation</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">Blog & News</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">Affiliate Program</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-white font-bold mb-6">{t('footer.legal')}</h5>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><Link className="hover:text-primary transition-colors" to="#">Privacy Policy</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">Terms of Service</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">Refund Policy</Link></li>
            <li><Link className="hover:text-primary transition-colors" to="#">Contact Us</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-500">{t('footer.rights')}</p>
        <div className="flex gap-6">
          <img className="h-4 grayscale hover:grayscale-0 transition-all" alt="Visa Card Icon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2776sN3VLDWpXAviVNNWjn36dr1mtCv_5Kc-C5S1bQ06DlROTwuanZB3mceFMKSutC0Amy_rrayzN3sp2tgHmDCdmqpTRzybEvSQz6h8MABK28pV_ceIApGljNLwP2hMPSBYaqke-Cp4FnPwHPXTp4mz6UmEcQIPqZAVMR3CgWaSyUY516wF93c3Dpjp5fG3OJBqbjJgxCAfKgpxtFBNR1aEBFuQmdTjOvSpA2Gq-FHQ0piMd43Ir7Z4YkTICpLQsvSsal5k_4rU"/>
          <img className="h-4 grayscale hover:grayscale-0 transition-all" alt="MasterCard Icon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCH0fUfA8pTBfwcKz1hZ6kGtPuxeeNetmQallD_V-CffDUDDimYS8jQrLWJdF-7OvchshAu19xwsqziDnL-uJTQ14DRl0yO4HBvbzynu_srGz2JzWDSptvmnb0QDl1Tossee9t-IkuQEAGzaM0tGmcW5mIvXai9s1JgI9ClpgOdiHg12fQRnjjDE_kqI490BW6zPRsrOmra8E5HdNfPBNdGLlMH7TLHlzU0TrIzLIIpklclHJfav9HHsy96qXSMvyCow0CPi5DKmJo"/>
          <img className="h-4 grayscale hover:grayscale-0 transition-all" alt="Tether Crypto Icon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8V0gaNSXuFKF1LiMWfGZE9IVKHd0emRyH3Vbj7XXZQD-1vYSVMYBmKtBjrzA9BE1Jf3R55z1rIMr94DLLtQ2_93eiLsSqHKZD0qmGxbK1G5ERAiE5qK1K0RfRNcKdRtaMBKcQelcqLPz4-IhKw904dkV6alhYdLIETIATmM5mx8X-6xlXI_TvOiDtKoEHMIvKF3Zq87lWxye2joIPC4uogs4zMRYjs51JCU_pirc9tLtsG2ohK8FRkWGE59D9k7HIWHCyvvtnMXU"/>
        </div>
      </div>
    </footer>
  );
}

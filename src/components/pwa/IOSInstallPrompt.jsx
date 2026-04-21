import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'ios_install_dismissed';
const LATER_KEY = 'ios_install_later';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export default function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const laterTs = localStorage.getItem(LATER_KEY);
    if (laterTs) {
      const daysSince = (Date.now() - Number(laterTs)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Show after a short delay so the page loads first
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLater = () => {
    localStorage.setItem(LATER_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-signal flex items-center justify-center text-white font-brand text-xl">L</div>
            <div>
              <p className="font-brand text-white text-sm">Lager AI</p>
              <p className="text-white/40 text-xs">IMvision</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-white/40 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2">
          <h2 className="font-brand text-white text-base mb-1">Installera Lager AI på hemskärmen</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            För att få notiser om meddelanden och använda appen i helskärm behöver du lägga till Lager AI på din hemskärm.
          </p>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3">
          <Step num={1} icon={<ShareIcon />} text='Tryck på Dela-ikonen längst ner i Safari' />
          <Step num={2} icon={<Plus className="w-4 h-4" />} text='Scrolla och välj "Lägg till på hemskärmen"' />
          <Step num={3} icon={<span className="text-xs font-bold">OK</span>} text='Tryck "Lägg till" för att bekräfta' />
        </div>

        {/* Arrow pointing down to Safari share bar */}
        <div className="flex justify-center pb-2">
          <div className="flex flex-col items-center gap-1 text-white/30">
            <div className="w-px h-6 bg-white/20" />
            <div className="w-3 h-3 border-r-2 border-b-2 border-white/30 rotate-45 -mt-2" />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 text-white/50 hover:text-white text-sm"
            onClick={handleLater}
          >
            Påminn mig senare
          </Button>
          <Button
            className="flex-1 bg-signal hover:bg-signal-hover text-white text-sm"
            onClick={handleDismiss}
          >
            Inte intresserad
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ num, icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0">
        {icon}
      </div>
      <p className="text-white/70 text-sm">{text}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
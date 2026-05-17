import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { getInstallPrompt, clearInstallPrompt } from '../lib/sw-register';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Poll for deferred prompt (it may not be available yet)
    const check = () => {
      const p = getInstallPrompt();
      if (p) setPrompt(p);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      clearInstallPrompt();
      setPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!prompt || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9997,
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        maxWidth: '320px',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#863bff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Download size={20} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>Install LuckyPOS</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
          Add to home screen for fast access
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '6px 14px',
          backgroundColor: '#863bff',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#999',
          padding: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { getInstallPrompt, clearInstallPrompt } from '../lib/sw-register';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem('pwa-install-dismissed') === 'true'
  );

  useEffect(() => {
    // Check if already dismissed in this session - use initial state
    if (dismissed) return;

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
  }, [dismissed]);

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
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
  };

  if (!prompt || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9997,
        backgroundColor: 'var(--bg-surface, #ffffff)',
        border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        maxWidth: '340px',
        color: 'var(--text-primary, #0B0B0D)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md, 8px)',
          backgroundColor: '#f0c444',
          color: '#0B0B0D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Download size={20} color="#0B0B0D" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>Install Lucky Store POS</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted, #666)', marginTop: 2 }}>
          Install as Chrome App for quick standalone launch
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '8px 14px',
          backgroundColor: '#0B0B0D',
          color: '#f0c444',
          border: '1px solid #f0c444',
          borderRadius: 'var(--radius-md, 8px)',
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
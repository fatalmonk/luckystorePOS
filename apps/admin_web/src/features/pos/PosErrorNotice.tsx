import type { CSSProperties } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface PosErrorNoticeProps {
  message: string;
  iconSize?: number;
  className?: string;
  style?: CSSProperties;
  onDismiss?: () => void;
}

export function PosErrorNotice({ message, iconSize = 18, className, style, onDismiss }: PosErrorNoticeProps) {
  return (
    <div role="alert" className={className} style={style}>
      <AlertCircle size={iconSize} aria-hidden="true" className="shrink-0" />
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error message"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

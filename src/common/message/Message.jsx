import { AlertCircle, Check, X } from '../icons/index.js';

export function InlineMessage({ children, variant = 'error', className = '' }) {
  const Icon = variant === 'success' ? Check : AlertCircle;
  return (
    <div className={`inline-message inline-message-${variant} ${className}`} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon size={15} />
      <span>{children}</span>
    </div>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`toast toast-${toast.type}`} role={isError ? 'alert' : 'status'}>
      <span className="toast-icon">{isError ? <AlertCircle size={17} /> : <Check size={17} />}</span>
      {toast.message}
      <button aria-label="Dismiss message" onClick={onDismiss}><X size={15} /></button>
    </div>
  );
}

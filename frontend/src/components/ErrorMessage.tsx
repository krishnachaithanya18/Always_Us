import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      style={{
        background: '#fff5f5',
        border: '1px solid #fecaca',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        textAlign: 'center',
        color: '#991b1b',
      }}
    >
      <AlertTriangle size={24} />
      <p style={{ margin: 0, fontSize: '0.95rem' }}>{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  )
}

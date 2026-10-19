interface LoadingSpinnerProps {
  fullPage?: boolean
  size?: number
}

export default function LoadingSpinner({ fullPage, size = 36 }: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size, height: size,
        border: `3px solid var(--color-rose-light)`,
        borderTopColor: 'var(--color-rose-deep)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (fullPage) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-cream)',
      }}>
        {spinner}
      </div>
    )
  }
  return spinner
}

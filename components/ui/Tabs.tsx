import * as React from 'react'

export function Tabs({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={['w-full', className].filter(Boolean).join(' ')}>{children}</div>
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 border-b border-[var(--border)]">{children}</div>
}

export function Tab({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-2 text-sm',
        active ? 'border-b-2 border-[var(--accent)] text-[var(--fg)]' : 'text-[var(--muted)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

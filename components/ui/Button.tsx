import * as React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md text-sm px-3 py-2 transition-colors'
  const styles =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-white hover:brightness-95 border border-transparent'
      : variant === 'outline'
        ? 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-black/5'
        : 'text-[var(--fg)] hover:bg-black/5'
  return <button className={[base, styles, className].filter(Boolean).join(' ')} {...rest} />
}

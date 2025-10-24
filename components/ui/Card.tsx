import * as React from 'react'

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--fg)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={['p-4', className].filter(Boolean).join(' ')} {...rest} />
}

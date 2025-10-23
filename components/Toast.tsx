'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const typeStyles: Record<ToastType, string> = {
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-200',
  success: 'border-green-500/50 bg-green-500/10 text-green-200',
  warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200',
  error: 'border-red-500/50 bg-red-500/10 text-red-200',
}

export function ToastItem({ toast, onDismiss }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border-2 p-4 shadow-2xl backdrop-blur-xl ${typeStyles[toast.type]}`}
      style={{ minWidth: 300, maxWidth: 420 }}
    >
      <div className="flex-1">
        <div className="font-semibold">{toast.title}</div>
        {toast.message && <div className="mt-1 text-sm opacity-90">{toast.message}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-1 transition-colors hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

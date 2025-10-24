'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MousePointer2 } from 'lucide-react'
import type { Cursor } from '@/lib/collab'

interface CollabCursorProps {
  cursors: Cursor[]
}

export default function CollabCursor({ cursors }: CollabCursorProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {cursors.map((cursor) => (
          <motion.div
            key={cursor.user.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="absolute"
            style={{ left: 0, top: 0 }}
          >
            <div className="relative">
              <MousePointer2
                className="h-5 w-5"
                style={{ color: cursor.user.color }}
                strokeWidth={2.5}
              />
              <div
                className="mt-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-white shadow-lg"
                style={{ backgroundColor: cursor.user.color }}
              >
                {cursor.user.name}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

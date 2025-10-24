'use client'

import * as React from 'react'
import { Users, MessageSquare, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collabManager,
  generateUserColor,
  generateUserName,
  type User,
  type Annotation,
} from '@/lib/collab'
import CollabCursor from './CollabCursor'

interface CollabPanelProps {
  roomId: string
  onStateChange?: (state: any) => void
}

export default function CollabPanel({ roomId, onStateChange }: CollabPanelProps) {
  const [connected, setConnected] = React.useState(false)
  const [users, setUsers] = React.useState<User[]>([])
  const [cursors, setCursors] = React.useState(collabManager.getCursors())
  const [annotations, setAnnotations] = React.useState<Annotation[]>([])
  const [showAnnotations, setShowAnnotations] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)

  React.useEffect(() => {
    // Generate user identity
    const user: User = {
      id: Math.random().toString(36).substring(7),
      name: generateUserName(),
      color: generateUserColor(),
    }
    setCurrentUser(user)

    // Connect to collaboration room
    collabManager.connect(roomId, user)
    setConnected(true)

    // Event listeners
    const handleUserJoined = (newUser: User) => {
      setUsers((prev) => [...prev, newUser])
    }

    const handleUserLeft = (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    }

    const handleCursorsUpdated = (newCursors: any[]) => {
      setCursors(newCursors)
    }

    const handleAnnotationsUpdated = (newAnnotations: Annotation[]) => {
      setAnnotations(newAnnotations)
    }

    const handleStateSync = (state: any) => {
      onStateChange?.(state)
    }

    collabManager.on('user-joined', handleUserJoined)
    collabManager.on('user-left', handleUserLeft)
    collabManager.on('cursors-updated', handleCursorsUpdated)
    collabManager.on('annotations-updated', handleAnnotationsUpdated)
    collabManager.on('state-synced', handleStateSync)

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      collabManager.moveCursor(e.clientX, e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      collabManager.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      collabManager.off('user-joined', handleUserJoined)
      collabManager.off('user-left', handleUserLeft)
      collabManager.off('cursors-updated', handleCursorsUpdated)
      collabManager.off('annotations-updated', handleAnnotationsUpdated)
      collabManager.off('state-synced', handleStateSync)
    }
  }, [roomId, onStateChange])

  const handleAddAnnotation = () => {
    const text = prompt('Enter annotation text:')
    if (text) {
      collabManager.addAnnotation({
        id: Math.random().toString(36).substring(7),
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        text,
      })
    }
  }

  if (!connected || !currentUser) return null

  return (
    <>
      {/* Collaborative cursors */}
      <CollabCursor cursors={cursors} />

      {/* Collaboration toolbar */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="glass-card-hover flex items-center gap-2 p-3">
          {/* Active users indicator */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <div className="flex -space-x-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0)}
              </div>
              {users.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
              {users.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-700 text-xs font-bold text-white">
                  +{users.length - 3}
                </div>
              )}
            </div>
          </div>

          {/* Annotations toggle */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="rounded p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Annotations"
            aria-label="Toggle annotations panel"
          >
            <MessageSquare className="h-4 w-4" />
            {annotations.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {annotations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Annotations panel */}
      <AnimatePresence>
        {showAnnotations && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed bottom-20 right-4 z-40 w-80"
          >
            <div className="glass-card max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 p-3">
                <h3 className="font-semibold text-white">Annotations</h3>
                <button
                  onClick={() => setShowAnnotations(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={handleAddAnnotation}
                  className="mb-3 w-full rounded bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Add Annotation
                </button>
                <div className="space-y-2">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="rounded border border-white/10 bg-black/20 p-2"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: annotation.user.color }}
                        />
                        <span className="text-xs text-gray-400">{annotation.user.name}</span>
                      </div>
                      <p className="text-sm text-gray-200">{annotation.text}</p>
                      <button
                        onClick={() => collabManager.removeAnnotation(annotation.id)}
                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {annotations.length === 0 && (
                    <p className="text-center text-sm text-gray-500">No annotations yet</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

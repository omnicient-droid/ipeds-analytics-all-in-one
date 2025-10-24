import { io, Socket } from 'socket.io-client'

export interface User {
  id: string
  name: string
  color: string
}

export interface Cursor {
  x: number
  y: number
  user: User
}

export interface Annotation {
  id: string
  x: number
  y: number
  text: string
  user: User
  timestamp: number
  chartId?: string
}

export interface DashboardState {
  selectedMetrics?: string[]
  timeRange?: { from: number; to: number }
  filters?: Record<string, any>
}

class CollaborationManager {
  private socket: Socket | null = null
  private user: User | null = null
  private cursors: Map<string, Cursor> = new Map()
  private annotations: Annotation[] = []
  private listeners: Map<string, Set<Function>> = new Map()

  connect(roomId: string, user: User) {
    if (this.socket?.connected) {
      this.socket.disconnect()
    }

    this.user = user
    this.socket = io({
      path: '/api/socketio',
      addTrailingSlash: false,
    })

    this.socket.on('connect', () => {
      this.socket?.emit('join-room', { roomId, user })
    })

    this.socket.on('user-joined', (data: { user: User }) => {
      this.emit('user-joined', data.user)
    })

    this.socket.on('user-left', (data: { userId: string }) => {
      this.cursors.delete(data.userId)
      this.emit('user-left', data.userId)
      this.emit('cursors-updated', Array.from(this.cursors.values()))
    })

    this.socket.on('cursor-move', (data: { cursor: Cursor }) => {
      this.cursors.set(data.cursor.user.id, data.cursor)
      this.emit('cursors-updated', Array.from(this.cursors.values()))
    })

    this.socket.on('annotation-added', (data: { annotation: Annotation }) => {
      this.annotations.push(data.annotation)
      this.emit('annotations-updated', this.annotations)
    })

    this.socket.on('annotation-removed', (data: { annotationId: string }) => {
      this.annotations = this.annotations.filter((a) => a.id !== data.annotationId)
      this.emit('annotations-updated', this.annotations)
    })

    this.socket.on('state-sync', (data: { state: DashboardState; userId: string }) => {
      if (data.userId !== this.user?.id) {
        this.emit('state-synced', data.state)
      }
    })

    this.socket.on('disconnect', () => {
      this.emit('disconnected')
    })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.cursors.clear()
    this.annotations = []
  }

  moveCursor(x: number, y: number) {
    if (!this.socket?.connected || !this.user) return

    const cursor: Cursor = { x, y, user: this.user }
    this.socket.emit('cursor-move', { cursor })
  }

  addAnnotation(annotation: Omit<Annotation, 'user' | 'timestamp'>) {
    if (!this.socket?.connected || !this.user) return

    const fullAnnotation: Annotation = {
      ...annotation,
      user: this.user,
      timestamp: Date.now(),
    }

    this.socket.emit('add-annotation', { annotation: fullAnnotation })
  }

  removeAnnotation(annotationId: string) {
    if (!this.socket?.connected) return
    this.socket.emit('remove-annotation', { annotationId })
  }

  syncState(state: DashboardState) {
    if (!this.socket?.connected || !this.user) return
    this.socket.emit('sync-state', { state, userId: this.user.id })
  }

  getCursors(): Cursor[] {
    return Array.from(this.cursors.values())
  }

  getAnnotations(): Annotation[] {
    return this.annotations
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data))
  }
}

export const collabManager = new CollaborationManager()

// Utility to generate random user colors
export function generateUserColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Generate random user name (can be replaced with real auth)
export function generateUserName(): string {
  const adjectives = ['Curious', 'Brilliant', 'Analytical', 'Strategic', 'Creative']
  const nouns = ['Analyst', 'Researcher', 'Scholar', 'Expert', 'Strategist']
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`
}

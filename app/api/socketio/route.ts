import { Server as SocketIOServer } from 'socket.io'
import { NextRequest, NextResponse } from 'next/server'

// Store Socket.IO server instance
let io: SocketIOServer | undefined

// Room state management
const rooms = new Map<
  string,
  {
    users: Map<string, any>
    annotations: any[]
    state: any
  }
>()

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.IO server
    const httpServer = (req as any).socket?.server
    if (httpServer) {
      io = new SocketIOServer(httpServer, {
        path: '/api/socketio',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      })

      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)

        socket.on('join-room', ({ roomId, user }) => {
          socket.join(roomId)

          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              users: new Map(),
              annotations: [],
              state: {},
            })
          }

          const room = rooms.get(roomId)!
          room.users.set(user.id, user)

          // Notify others
          socket.to(roomId).emit('user-joined', { user })

          // Send current room state to new user
          socket.emit('annotations-sync', { annotations: room.annotations })
          socket.emit('state-sync', { state: room.state })
        })

        socket.on('cursor-move', ({ cursor }) => {
          const roomIds = Array.from(socket.rooms).filter((r) => r !== socket.id)
          roomIds.forEach((roomId) => {
            socket.to(roomId).emit('cursor-move', { cursor })
          })
        })

        socket.on('add-annotation', ({ annotation }) => {
          const roomIds = Array.from(socket.rooms).filter((r) => r !== socket.id)
          roomIds.forEach((roomId) => {
            const room = rooms.get(roomId)
            if (room) {
              room.annotations.push(annotation)
              io?.to(roomId).emit('annotation-added', { annotation })
            }
          })
        })

        socket.on('remove-annotation', ({ annotationId }) => {
          const roomIds = Array.from(socket.rooms).filter((r) => r !== socket.id)
          roomIds.forEach((roomId) => {
            const room = rooms.get(roomId)
            if (room) {
              room.annotations = room.annotations.filter((a) => a.id !== annotationId)
              io?.to(roomId).emit('annotation-removed', { annotationId })
            }
          })
        })

        socket.on('sync-state', ({ state, userId }) => {
          const roomIds = Array.from(socket.rooms).filter((r) => r !== socket.id)
          roomIds.forEach((roomId) => {
            const room = rooms.get(roomId)
            if (room) {
              room.state = { ...room.state, ...state }
              socket.to(roomId).emit('state-sync', { state, userId })
            }
          })
        })

        socket.on('disconnect', () => {
          console.log('Client disconnected:', socket.id)
          const roomIds = Array.from(socket.rooms).filter((r) => r !== socket.id)
          roomIds.forEach((roomId) => {
            const room = rooms.get(roomId)
            if (room) {
              // Find and remove user
              let userId: string | undefined
              room.users.forEach((user, id) => {
                if ((user as any).socketId === socket.id) {
                  userId = id
                }
              })
              if (userId) {
                room.users.delete(userId)
                socket.to(roomId).emit('user-left', { userId })
              }
            }
          })
        })
      })
    }
  }

  return NextResponse.json({ message: 'Socket.IO initialized' })
}

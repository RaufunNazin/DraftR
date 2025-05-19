import { io, type Socket } from "socket.io-client"
import { create } from "zustand"
import type { Player, Captain, BidMode } from "@/lib/types"

export interface AuctionState {
  isActive: boolean
  isPaused: boolean
  bidMode: BidMode
  timer: number
  currentPlayer: Player | null
  currentBid: number
  currentBidder: Captain | null
  skipVotes: string[]
  captains: Captain[]
  players: Player[]
  history: AuctionHistoryItem[]
}

export interface AuctionHistoryItem {
  playerId: string
  playerName: string
  captainId: string
  captainName: string
  finalBid: number
  timestamp: Date
}

interface SocketStore {
  socket: Socket | null
  isConnected: boolean
  tournamentCode: string | null
  error: string | null
  auctionState: AuctionState | null

  connect: () => void
  disconnect: () => void
  joinTournament: (code: string) => void
  startAuction: () => void
  placeBid: (captainId: string, amount: number) => void
  voteToSkip: (captainId: string) => void
  changeBidMode: (mode: BidMode) => void
  togglePause: (isPaused: boolean) => void
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  tournamentCode: null,
  error: null,
  auctionState: null,

  connect: () => {
    if (get().isConnected) return

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000")

    socket.on("connect", () => {
      set({ socket, isConnected: true, error: null })
      console.log("✅ Socket connected")
    })

    socket.on("disconnect", () => {
      set({ isConnected: false })
      console.log("❌ Socket disconnected")
    })

    socket.on("error", (data: { message: string }) => {
      set({ error: data.message })
      console.error("Socket error:", data.message)
    })

    socket.on("auction:state", (data: AuctionState) => {
      set({ auctionState: data })
    })

    socket.on("auction:player", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          currentPlayer: data.player,
          currentBid: data.currentBid,
          currentBidder: data.currentBidder,
          skipVotes: []
        } : null
      }))
    })

    socket.on("auction:bid", (data) => {
      set((state) => {
        if (!state.auctionState) return { auctionState: null }

        const updatedCaptains = state.auctionState.captains.map((captain) =>
          captain.id === data.captainId ? {
            ...captain,
            credits: data.captainCredits
          } : captain
        )

        const bidder = updatedCaptains.find((c) => c.id === data.captainId) || null

        return {
          auctionState: {
            ...state.auctionState,
            currentBid: data.amount,
            currentBidder: bidder,
            captains: updatedCaptains
          }
        }
      })
    })

    socket.on("auction:timer", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          timer: data.timer
        } : null
      }))
    })

    socket.on("auction:skip", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          skipVotes: data.skipVotes
        } : null
      }))
    })

    socket.on("auction:mode", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          bidMode: data.mode
        } : null
      }))
    })

    socket.on("auction:pause", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          isPaused: data.isPaused
        } : null
      }))
    })

    socket.on("auction:start", (data) => {
      set((state) => ({
        auctionState: state.auctionState ? {
          ...state.auctionState,
          isActive: data.isActive
        } : null
      }))
    })

    socket.on("auction:complete", (data) => {
      set((state:any) => {
        if (!state.auctionState) return { auctionState: null }

        if ("isActive" in data) {
          return {
            auctionState: {
              ...state.auctionState,
              isActive: data.isActive,
              currentPlayer: null,
              currentBid: 0,
              currentBidder: null
            }
          }
        }

        const updatedCaptains = state.auctionState.captains.map((captain:Captain) => {
          if (captain.id === data.captainId) {
            const player = state.auctionState.players.find((p:any) => p.id === data.playerId)
            return player ? {
              ...captain,
              credits: captain.credits - data.finalBid,
              pickedPlayers: [...captain.pickedPlayers, player],
              pickedTiers: [...captain.pickedTiers, player.tier]
            } : captain
          }
          return captain
        })

        const updatedPlayers = state.auctionState.players.filter((p:any) => p.id !== data.playerId)
        const updatedHistory = [data, ...state.auctionState.history]

        return {
          auctionState: {
            ...state.auctionState,
            captains: updatedCaptains,
            players: updatedPlayers,
            history: updatedHistory,
            currentPlayer: null,
            currentBid: 0,
            currentBidder: null
          }
        }
      })
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false, tournamentCode: null })
    }
  },

  joinTournament: (code: string) => {
    const { socket, isConnected } = get()
    if (!socket || !isConnected) {
      set({ error: "Socket not connected" })
      return
    }
    socket.emit("join-tournament", code)
    set({ tournamentCode: code })
  },

  startAuction: () => {
    const { socket, tournamentCode } = get()
    if (!socket || !tournamentCode) {
      set({ error: "Socket not connected or tournament not joined" })
      return
    }
    socket.emit("auction:start", { tournamentCode })
  },

  placeBid: (captainId: string, amount: number) => {
    const { socket, tournamentCode } = get()
    if (!socket || !tournamentCode) {
      set({ error: "Socket not connected or tournament not joined" })
      return
    }
    socket.emit("auction:bid", { tournamentCode, captainId, amount })
  },

  voteToSkip: (captainId: string) => {
    const { socket, tournamentCode } = get()
    if (!socket || !tournamentCode) {
      set({ error: "Socket not connected or tournament not joined" })
      return
    }
    socket.emit("auction:skip", { tournamentCode, captainId })
  },

  changeBidMode: (mode: BidMode) => {
    const { socket, tournamentCode } = get()
    if (!socket || !tournamentCode) {
      set({ error: "Socket not connected or tournament not joined" })
      return
    }
    socket.emit("auction:mode", { tournamentCode, mode })
  },

  togglePause: (isPaused: boolean) => {
    const { socket, tournamentCode } = get()
    if (!socket || !tournamentCode) {
      set({ error: "Socket not connected or tournament not joined" })
      return
    }
    socket.emit("auction:pause", { tournamentCode, isPaused })
  },
}))

export const emitSocketEvent = (event: { type: string; payload: any }) => {
  const { socket, tournamentCode } = useSocketStore.getState()
  if (!socket || !tournamentCode) {
    console.error("Socket not connected or tournament not joined")
    return
  }
  socket.emit(event.type, { tournamentCode, ...event.payload })
}

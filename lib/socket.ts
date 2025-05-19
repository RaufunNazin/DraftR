import { io, type Socket } from "socket.io-client"
import { create } from "zustand"
import type { Player, Captain, BidMode } from "@/lib/types"

type SocketState = {
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  error?: string
  joinTournament: (tournamentId: string) => void
}

// Define socket event types
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

// Socket store
interface SocketStore {
  socket: Socket | null
  isConnected: boolean
  tournamentCode: string | null
  error: string | null

  // Connection methods
  connect: () => void
  disconnect: () => void
  joinTournament: (code: string) => void

  // Auction state
  auctionState: AuctionState | null

  // Auction methods
  startAuction: () => void
  placeBid: (captainId: string, amount: number) => void
  voteToSkip: (captainId: string) => void
  changeBidMode: (mode: BidMode) => void
  togglePause: (isPaused: boolean) => void
}

// Create socket store
export const useAuctionStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  tournamentCode: null,
  error: null,
  auctionState: null,

  connect: () => {
    try {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000")

      socket.on("connect", () => {
        set({ socket, isConnected: true, error: null })
        console.log("Socket connected:", socket.id)
      })

      socket.on("disconnect", () => {
        set({ isConnected: false })
        console.log("Socket disconnected")
      })

      socket.on("error", (data: { message: string }) => {
        set({ error: data.message })
        console.error("Socket error:", data.message)
      })

      // Auction state updates
      socket.on("auction:state", (data: AuctionState) => {
        set({ auctionState: data })
      })

      socket.on(
        "auction:player",
        (data: {
          player: Player
          currentBid: number
          currentBidder: Captain | null
        }) => {
          set((state) => ({
            auctionState: state.auctionState
              ? {
                  ...state.auctionState,
                  currentPlayer: data.player,
                  currentBid: data.currentBid,
                  currentBidder: data.currentBidder,
                  skipVotes: [],
                }
              : null,
          }))
        },
      )

      socket.on(
        "auction:bid",
        (data: {
          amount: number
          captainId: string
          captainName: string
          captainTier: number
          captainCredits: number
        }) => {
          set((state) => {
            if (!state.auctionState) return { auctionState: null }

            // Find the captain and update their info
            const updatedCaptains = state.auctionState.captains.map((captain) => {
              if (captain.id === data.captainId) {
                return {
                  ...captain,
                  credits: data.captainCredits,
                }
              }
              return captain
            })

            // Find the bidder
            const bidder = updatedCaptains.find((c) => c.id === data.captainId) || null

            return {
              auctionState: {
                ...state.auctionState,
                currentBid: data.amount,
                currentBidder: bidder,
                captains: updatedCaptains,
              },
            }
          })
        },
      )

      socket.on("auction:timer", (data: { timer: number }) => {
        set((state) => ({
          auctionState: state.auctionState
            ? {
                ...state.auctionState,
                timer: data.timer,
              }
            : null,
        }))
      })

      socket.on("auction:skip", (data: { skipVotes: string[] }) => {
        set((state) => ({
          auctionState: state.auctionState
            ? {
                ...state.auctionState,
                skipVotes: data.skipVotes,
              }
            : null,
        }))
      })

      socket.on("auction:mode", (data: { mode: BidMode }) => {
        set((state) => ({
          auctionState: state.auctionState
            ? {
                ...state.auctionState,
                bidMode: data.mode,
              }
            : null,
        }))
      })

      socket.on("auction:pause", (data: { isPaused: boolean }) => {
        set((state) => ({
          auctionState: state.auctionState
            ? {
                ...state.auctionState,
                isPaused: data.isPaused,
              }
            : null,
        }))
      })

      socket.on("auction:start", (data: { isActive: boolean }) => {
        set((state) => ({
          auctionState: state.auctionState
            ? {
                ...state.auctionState,
                isActive: data.isActive,
              }
            : null,
        }))
      })

      socket.on("auction:complete", (data: AuctionHistoryItem | { isActive: boolean }) => {
        set((state) => {
          if (!state.auctionState) return { auctionState: null }

          // Check if this is the end of the auction
          if ("isActive" in data) {
            return {
              auctionState: {
                ...state.auctionState,
                isActive: data.isActive,
                currentPlayer: null,
                currentBid: 0,
                currentBidder: null,
              },
            }
          }

          // This is a player being drafted
          // Update captains
          const updatedCaptains = state.auctionState.captains.map((captain) => {
            if (captain.id === data.captainId) {
              // Find the player
              const player = state.auctionState?.players.find((p) => p.id === data.playerId) || null

              if (player) {
                return {
                  ...captain,
                  credits: captain.credits - data.finalBid,
                  pickedPlayers: [...captain.pickedPlayers, player],
                  pickedTiers: [...captain.pickedTiers, player.tier],
                }
              }
            }
            return captain
          })

          // Remove player from available players
          const updatedPlayers = state.auctionState.players.filter((p) => p.id !== data.playerId)

          // Add to history
          const updatedHistory = [data, ...state.auctionState.history]

          return {
            auctionState: {
              ...state.auctionState,
              captains: updatedCaptains,
              players: updatedPlayers,
              history: updatedHistory,
              currentPlayer: null,
              currentBid: 0,
              currentBidder: null,
            },
          }
        })
      })
    } catch (error) {
      console.error("Socket connection error:", error)
      set({ error: "Failed to connect to server" })
    }
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
  const { socket, tournamentCode } = useAuctionStore.getState()

  if (!socket || !tournamentCode) {
    console.error("Socket not connected or tournament not joined")
    return
  }

  socket.emit(event.type, { tournamentCode, ...event.payload })
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  connect: () => {
    // connect logic here
  },
  disconnect: () => {
    // disconnect logic here
  },
  joinTournament: (id: string) => {
    // join logic
  },
}))
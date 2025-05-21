"use client";

import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Player, Captain, BidMode } from "@/lib/types";

// Define socket event types
export interface AuctionState {
  isActive: boolean;
  isPaused: boolean;
  bidMode: BidMode;
  timer: number;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: Captain | null;
  skipVotes: string[];
  captains: Captain[];
  players: Player[];
  history: AuctionHistoryItem[];
}

export interface AuctionHistoryItem {
  playerId: string;
  playerName: string;
  captainId: string;
  captainName: string;
  finalBid: number;
  timestamp: Date;
}

// Socket store
interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  tournamentCode: string | null;
  error: string | null;
  lastError: number | null;
  reconnectAttempts: number;

  // Connection methods
  connect: () => void;
  disconnect: () => void;
  joinTournament: (code: string) => void;

  // Auction state
  auctionState: AuctionState | null;
  localAuctionState: AuctionState | null; // For immediate UI updates
  pendingBids: Map<string, { amount: number; timestamp: number }>;
  pendingSkips: Map<string, { timestamp: number }>;

  // Auction methods
  startAuction: () => void;
  placeBid: (captainId: string, amount: number) => void;
  voteToSkip: (captainId: string) => void;
  changeBidMode: (mode: BidMode) => void;
  togglePause: (isPaused: boolean) => void;

  // Optimistic update helpers
  addPendingBid: (captainId: string, amount: number) => void;
  addPendingSkip: (captainId: string) => void;
  clearPendingBid: (captainId: string) => void;
  clearPendingSkip: (captainId: string) => void;

  // Local state management
  updateLocalState: (updates: Partial<AuctionState>) => void;
}

// Create socket store with persistence for tournament code
export const useSocketStore = create<SocketStore>()(
  persist(
    (set, get) => ({
      socket: null,
      isConnected: false,
      isConnecting: false,
      tournamentCode: null,
      error: null,
      lastError: null,
      reconnectAttempts: 0,
      auctionState: null,
      localAuctionState: null, // For immediate UI updates
      pendingBids: new Map(),
      pendingSkips: new Map(),

      // Update local state for immediate UI feedback
      updateLocalState: (updates) => {
        const currentState = get().localAuctionState || get().auctionState;
        if (!currentState) return;

        set({
          localAuctionState: {
            ...currentState,
            ...updates,
          },
        });
      },

      connect: () => {
        // Don't reconnect if already connected or connecting
        if (get().isConnected || get().isConnecting) return;

        set({ isConnecting: true });

        const socket = io(
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
          {
            // Optimize connection settings
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            // Use websocket transport by default for lower latency
            transports: ["websocket", "polling"],
          }
        );

        socket.on("connect", () => {
          set({
            socket,
            isConnected: true,
            isConnecting: false,
            error: null,
            reconnectAttempts: 0,
          });
          console.log("✅ Socket connected");

          // Rejoin tournament if we have a code
          const { tournamentCode } = get();
          if (tournamentCode) {
            socket.emit("join-tournament", tournamentCode);
          }
        });

        socket.on("disconnect", () => {
          set({ isConnected: false });
          console.log("❌ Socket disconnected");
        });

        socket.on("connect_error", (error) => {
          const now = Date.now();
          const { lastError, reconnectAttempts } = get();

          // Only log errors if they're more than 5 seconds apart
          if (!lastError || now - lastError > 5000) {
            console.error("Socket connection error:", error.message);
            set({
              error: `Connection error: ${error.message}`,
              lastError: now,
              reconnectAttempts: reconnectAttempts + 1,
            });
          }

          // If we've tried to reconnect too many times, stop trying
          if (reconnectAttempts >= 5) {
            socket.disconnect();
            set({
              isConnecting: false,
              error:
                "Failed to connect after multiple attempts. Please refresh the page.",
            });
          }
        });

        socket.on("error", (data: { message: string }) => {
          set({ error: data.message });
          console.error("Socket error:", data.message);
        });

        // Auction state updates with debouncing for high-frequency events
        let timerUpdateTimeout: NodeJS.Timeout | null = null;

        socket.on("auction:state", (data: AuctionState) => {
          set({
            auctionState: data,
            localAuctionState: data, // Reset local state when we get a full state update
          });
        });

        socket.on(
          "auction:player",
          (data: {
            player: Player;
            currentBid: number;
            currentBidder: Captain | null;
          }) => {
            const newState = {
              currentPlayer: data.player,
              currentBid: data.currentBid,
              currentBidder: data.currentBidder,
              skipVotes: [],
            };

            set((state) => ({
              auctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
              localAuctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
            }));
          }
        );

        socket.on(
          "auction:bid",
          (data: {
            amount: number;
            captainId: string;
            captainName: string;
            captainTier: number;
            captainCredits: number;
          }) => {
            set((state) => {
              if (!state.auctionState)
                return { auctionState: null, localAuctionState: null };

              // Find the captain and update their info
              const updatedCaptains = state.auctionState.captains.map(
                (captain) => {
                  if (captain.id === data.captainId) {
                    return {
                      ...captain,
                      credits: data.captainCredits,
                    };
                  }
                  return captain;
                }
              );

              // Find the bidder
              const bidder =
                updatedCaptains.find((c) => c.id === data.captainId) || null;

              // Clear any pending bids from this captain
              const pendingBids = new Map(state.pendingBids);
              pendingBids.delete(data.captainId);

              const newState = {
                currentBid: data.amount,
                currentBidder: bidder,
                captains: updatedCaptains,
              };

              return {
                auctionState: {
                  ...state.auctionState,
                  ...newState,
                },
                localAuctionState: {
                  ...state.auctionState,
                  ...newState,
                },
                pendingBids,
              };
            });
          }
        );

        socket.on("auction:timer", (data: { timer: number }) => {
          // Debounce timer updates to reduce rendering load
          if (timerUpdateTimeout) {
            clearTimeout(timerUpdateTimeout);
          }

          timerUpdateTimeout = setTimeout(() => {
            set((state) => {
              const newState = { timer: data.timer };

              return {
                auctionState: state.auctionState
                  ? {
                      ...state.auctionState,
                      ...newState,
                    }
                  : null,
                localAuctionState:
                  state.localAuctionState || state.auctionState
                    ? {
                        ...(state.localAuctionState || state.auctionState),
                        ...newState,
                      }
                    : null,
              };
            });
          }, 100); // Update UI at most every 100ms for timer
        });

        socket.on("auction:skip", (data: { skipVotes: string[] }) => {
          set((state) => {
            // Clear any pending skips that are now confirmed
            const pendingSkips = new Map(state.pendingSkips);
            data.skipVotes.forEach((captainId) => {
              pendingSkips.delete(captainId);
            });

            const newState = { skipVotes: data.skipVotes };

            return {
              auctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
              localAuctionState:
                state.localAuctionState || state.auctionState
                  ? {
                      ...(state.localAuctionState || state.auctionState),
                      ...newState,
                    }
                  : null,
              pendingSkips,
            };
          });
        });

        socket.on("auction:mode", (data: { mode: BidMode }) => {
          set((state) => {
            const newState = { bidMode: data.mode };

            return {
              auctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
              localAuctionState:
                state.localAuctionState || state.auctionState
                  ? {
                      ...(state.localAuctionState || state.auctionState),
                      ...newState,
                    }
                  : null,
            };
          });
        });

        socket.on("auction:pause", (data: { isPaused: boolean }) => {
          set((state) => {
            const newState = { isPaused: data.isPaused };

            return {
              auctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
              localAuctionState:
                state.localAuctionState || state.auctionState
                  ? {
                      ...(state.localAuctionState || state.auctionState),
                      ...newState,
                    }
                  : null,
            };
          });
        });

        socket.on("auction:start", (data: { isActive: boolean }) => {
          set((state) => {
            const newState = { isActive: data.isActive };

            return {
              auctionState: state.auctionState
                ? {
                    ...state.auctionState,
                    ...newState,
                  }
                : null,
              localAuctionState:
                state.localAuctionState || state.auctionState
                  ? {
                      ...(state.localAuctionState || state.auctionState),
                      ...newState,
                    }
                  : null,
            };
          });
        });

        socket.on(
          "auction:complete",
          (data: AuctionHistoryItem | { isActive: boolean }) => {
            set((state) => {
              if (!state.auctionState)
                return { auctionState: null, localAuctionState: null };

              // Check if this is the end of the auction
              if ("isActive" in data) {
                const newState = {
                  isActive: data.isActive,
                  currentPlayer: null,
                  currentBid: 0,
                  currentBidder: null,
                };

                return {
                  auctionState: {
                    ...state.auctionState,
                    ...newState,
                  },
                  localAuctionState: {
                    ...state.auctionState,
                    ...newState,
                  },
                };
              }

              // Update captains
              const updatedCaptains = state.auctionState.captains.map(
                (captain) => {
                  if (captain.id === data.captainId) {
                    // Find the player
                    const player =
                      state.auctionState?.players.find(
                        (p) => p.id === data.playerId
                      ) || null;

                    if (player) {
                      return {
                        ...captain,
                        credits: captain.credits - data.finalBid,
                        pickedPlayers: [
                          ...(captain.pickedPlayers || []),
                          player,
                        ],
                        pickedTiers: [
                          ...(captain.pickedTiers || []),
                          { tier: player.tier },
                        ],
                      };
                    }
                  }
                  return captain;
                }
              );

              // Remove player from available players
              const updatedPlayers = state.auctionState.players.filter(
                (p) => p.id !== data.playerId
              );

              // Add to history
              const updatedHistory = [
                data,
                ...(state.auctionState.history || []),
              ];

              const newState = {
                captains: updatedCaptains,
                players: updatedPlayers,
                history: updatedHistory,
                currentPlayer: null,
                currentBid: 0,
                currentBidder: null,
              };

              return {
                auctionState: {
                  ...state.auctionState,
                  ...newState,
                },
                localAuctionState: {
                  ...state.auctionState,
                  ...newState,
                },
              };
            });
          }
        );

        set({ socket });
      },

      disconnect: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({
            socket: null,
            isConnected: false,
            isConnecting: false,
            tournamentCode: null,
          });
        }
      },

      joinTournament: (code: string) => {
        const { socket, isConnected } = get();

        if (!socket || !isConnected) {
          // Store the code and connect first
          set({ tournamentCode: code });
          get().connect();
          return;
        }

        socket.emit("join-tournament", code);
        set({ tournamentCode: code });
      },

      startAuction: () => {
        const { socket, tournamentCode } = get();

        if (!socket || !tournamentCode) {
          set({ error: "Socket not connected or tournament not joined" });
          return;
        }

        console.log(
          "Emitting auction:start event with tournamentCode:",
          tournamentCode
        );
        socket.emit("auction:start", { tournamentCode });
      },

      // Add optimistic updates for better UX
      addPendingBid: (captainId: string, amount: number) => {
        const pendingBids = new Map(get().pendingBids);
        pendingBids.set(captainId, { amount, timestamp: Date.now() });
        set({ pendingBids });
      },

      addPendingSkip: (captainId: string) => {
        const pendingSkips = new Map(get().pendingSkips);
        pendingSkips.set(captainId, { timestamp: Date.now() });
        set({ pendingSkips });
      },

      clearPendingBid: (captainId: string) => {
        const pendingBids = new Map(get().pendingBids);
        pendingBids.delete(captainId);
        set({ pendingBids });
      },

      clearPendingSkip: (captainId: string) => {
        const pendingSkips = new Map(get().pendingSkips);
        pendingSkips.delete(captainId);
        set({ pendingSkips });
      },

      placeBid: (captainId: string, amount: number) => {
        const { socket, tournamentCode, auctionState } = get();

        if (!socket || !tournamentCode) {
          set({ error: "Socket not connected or tournament not joined" });
          return;
        }

        // Apply optimistic update
        if (auctionState) {
          get().addPendingBid(captainId, amount);

          // Find the captain
          const captain = auctionState.captains.find((c) => c.id === captainId);

          if (captain) {
            // Optimistically update the UI immediately
            const updatedCaptains = auctionState.captains.map((c) => {
              if (c.id === captainId) {
                return {
                  ...c,
                  // Don't reduce credits yet to avoid "not enough credits" error
                  // We'll just update the current bid and bidder
                };
              }
              return c;
            });

            get().updateLocalState({
              currentBid: amount,
              currentBidder: captain,
              captains: updatedCaptains,
            });
          }
        }

        // Send to server
        socket.emit("auction:bid", { tournamentCode, captainId, amount });

        // Clear pending bid after a timeout if no response
        setTimeout(() => {
          get().clearPendingBid(captainId);
        }, 5000);
      },

      voteToSkip: (captainId: string) => {
        const { socket, tournamentCode, auctionState } = get();

        if (!socket || !tournamentCode) {
          set({ error: "Socket not connected or tournament not joined" });
          return;
        }

        // Apply optimistic update
        if (auctionState) {
          get().addPendingSkip(captainId);

          // Optimistically update the UI
          const currentSkipVotes = auctionState.skipVotes || [];

          // Add to skip votes if not already there
          if (!currentSkipVotes.includes(captainId)) {
            get().updateLocalState({
              skipVotes: [...currentSkipVotes, captainId],
            });
          }
        }

        // Send to server
        socket.emit("auction:skip", { tournamentCode, captainId });

        // Clear pending skip after a timeout if no response
        setTimeout(() => {
          get().clearPendingSkip(captainId);
        }, 5000);
      },

      changeBidMode: (mode: BidMode) => {
        const { socket, tournamentCode } = get();

        if (!socket || !tournamentCode) {
          set({ error: "Socket not connected or tournament not joined" });
          return;
        }

        // Optimistically update the UI
        get().updateLocalState({ bidMode: mode });

        socket.emit("auction:mode", { tournamentCode, mode });
      },

      togglePause: (isPaused: boolean) => {
        const { socket, tournamentCode } = get();

        if (!socket || !tournamentCode) {
          set({ error: "Socket not connected or tournament not joined" });
          return;
        }

        // Optimistically update the UI
        get().updateLocalState({ isPaused });

        socket.emit("auction:pause", { tournamentCode, isPaused });
      },
    }),
    {
      name: "Esports-auction-socket",
      // Only persist the tournament code
      partialize: (state) => ({ tournamentCode: state.tournamentCode }),
    }
  )
);

// Create a hook to access the correct auction state (local or server)
export function useAuctionState() {
  return useSocketStore(
    (state) => state.localAuctionState || state.auctionState
  );
}

export const emitSocketEvent = (event: { type: string; payload: any }) => {
  const { socket, tournamentCode } = useSocketStore.getState();

  if (!socket || !tournamentCode) {
    console.error("Socket not connected or tournament not joined");
    return;
  }

  socket.emit(event.type, { tournamentCode, ...event.payload });
};

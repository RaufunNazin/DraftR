import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { Player, Captain, UserRole, Tournament } from "./types"
import { TIER_STARTING_PRICES } from "./constants"
import { useSession } from "next-auth/react"


interface AppState {
  // User role
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  selectedCaptainId: string | null
  setSelectedCaptainId: (id: string | null) => void

  // Player registration
  registeredPlayers: Player[]
  addPlayer: (player: Omit<Player, "id" | "startingPrice">) => void
  removePlayer: (id: string) => void

  // Captain management
  captains: Captain[]

  // Tournament management
  tournaments: Tournament[]
  currentTournamentCode: string | null
  createTournament: (name: string) => string // Returns tournament code
  joinTournament: (code: string) => boolean // Returns success status
  setCurrentTournamentCode: (code: string | null) => void

  // UI state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  sidebarTab: "roster" | "history"
  setSidebarTab: (tab: "roster" | "history") => void

  // Reset state
  resetState: () => void
}

const { data: session, status } = useSession();
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User role
      userRole: "AUDIENCE",
      setUserRole: (role) => set({ userRole: role }),
      selectedCaptainId: null,
      setSelectedCaptainId: (id) => set({ selectedCaptainId: id }),

      // Player registration
      registeredPlayers: [],
      addPlayer: (player) =>
        set((state) => {
          const newPlayer: Player = {
            id: uuidv4(),
            name: player.name,
            tier: player.tier,
            role: player.role,
            agents: player.agents,
            startingPrice: TIER_STARTING_PRICES[player.tier],
            captainId: null,
          }
          return { registeredPlayers: [...state.registeredPlayers, newPlayer] }
        }),
      removePlayer: (id) =>
        set((state) => ({
          registeredPlayers: state.registeredPlayers.filter((player) => player.id !== id),
        })),

      // Captain management
      captains: [],

      // Tournament management
      tournaments: [],
      currentTournamentCode: null,
      createTournament: (name) => {
        const code = generateTournamentCode()
        const newTournament: Tournament = {
          id: uuidv4(),
          name,
          code,
          status: "UPCOMING",
          createdAt: new Date(),
          hostId: session?.user?.id, // In a real app, this would be the current user's ID
          host: session?.user
            ? {
                ...session.user,
                name: session.user.name ?? "",
                email: session.user.email ?? "",
              }
            : undefined, // Replace with actual host object if available
          players: [],
          captains: [],
        }
        set((state) => ({
          tournaments: [...state.tournaments, newTournament],
          currentTournamentCode: code,
        }))
        return code
      },
      joinTournament: (code) => {
        const tournament = get().tournaments.find((t) => t.code === code)
        if (tournament) {
          set({ currentTournamentCode: code })
          return true
        }
        return false
      },
      setCurrentTournamentCode: (code) => set({ currentTournamentCode: code }),

      // UI state
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      sidebarTab: "roster",
      setSidebarTab: (tab) => set({ sidebarTab: tab }),

      // Reset state
      resetState: () =>
        set({
          registeredPlayers: [],
          captains: [],
          userRole: "AUDIENCE",
          selectedCaptainId: null,
          isSidebarOpen: false,
          sidebarTab: "roster",
          currentTournamentCode: null,
        }),
    }),
    {
      name: "valorant-auction-storage",
    },
  ),
)

// Helper function to generate a random 4-character tournament code
function generateTournamentCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

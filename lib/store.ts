import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { Player, Captain, Role, Agent, Tier, UserRole, Tournament } from "./types"
import { MOCK_CAPTAINS, MOCK_PLAYERS, TIER_STARTING_PRICES, MOCK_TOURNAMENTS } from "./constants"

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
  loadMockPlayers: () => void

  // Captain management
  captains: Captain[]
  loadMockCaptains: () => void

  // Tournament management
  tournaments: Tournament[]
  currentTournamentCode: string | null
  loadMockTournaments: () => void
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User role
      userRole: "audience",
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
          }
          return { registeredPlayers: [...state.registeredPlayers, newPlayer] }
        }),
      removePlayer: (id) =>
        set((state) => ({
          registeredPlayers: state.registeredPlayers.filter((player) => player.id !== id),
        })),
      loadMockPlayers: () =>
        set(() => {
          const players = MOCK_PLAYERS.map((player) => ({
            id: uuidv4(),
            name: player.name,
            tier: player.tier as Tier,
            role: player.role as Role,
            agents: player.agents as Agent[],
            startingPrice: TIER_STARTING_PRICES[player.tier as Tier],
          }))
          return { registeredPlayers: players }
        }),

      // Captain management
      captains: [],
      loadMockCaptains: () =>
        set(() => {
          const captains = MOCK_CAPTAINS.map((captain) => ({
            ...captain,
            pickedPlayers: [],
            pickedTiers: [],
          }))
          return { captains }
        }),

      // Tournament management
      tournaments: [],
      currentTournamentCode: null,
      loadMockTournaments: () => set({ tournaments: MOCK_TOURNAMENTS }),
      createTournament: (name) => {
        const code = generateTournamentCode()
        const newTournament: Tournament = {
          id: uuidv4(),
          name,
          code,
          status: "upcoming",
          createdAt: Date.now(),
          hostId: "host-1", // In a real app, this would be the current user's ID
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
          userRole: "audience",
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

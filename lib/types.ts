export type PlayerRole = "DUELIST" | "INITIATOR" | "CONTROLLER" | "SENTINEL" | "FLEX"

export type Role = "AUDIENCE" | "CAPTAIN"

export type Agent =
  | "Jett"
  | "Phoenix"
  | "Raze"
  | "Reyna"
  | "Yoru"
  | "Neon"
  | "Iso"
  | "Waylay" // Duelists
  | "Sova"
  | "Breach"
  | "Skye"
  | "KAY/O"
  | "Fade"
  | "Gekko"
  | "Tejo" // Initiators
  | "Brimstone"
  | "Omen"
  | "Viper"
  | "Astra"
  | "Harbor"
  | "Clove" // Controllers
  | "Killjoy"
  | "Cypher"
  | "Sage"
  | "Chamber"
  | "Deadlock"
  | "Vyse" // Sentinels

export type Tier = 1 | 2 | 3 | 4 | 5

export type UserRole = "ADMIN" | "HOST" | "CAPTAIN" | "AUDIENCE"

export type TournamentStatus = "UPCOMING" | "ACTIVE" | "COMPLETED"

export type BidMode = "OPEN" | "HIDDEN" | "BLIND" | "TIMED"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface PlayerAgent {
  id: string
  agent: string
  playerId: string
}

export interface Player {
  id: string
  name: string
  tier: Tier
  role: PlayerRole
  agents: PlayerAgent[]
  startingPrice: number
  captainId: string | null
  captain?: Captain
}

export interface CaptainPickedTier {
  id: string
  tier: Tier
  captainId: string
}

export interface CaptainAgent {
  id: string
  agent: string
  captainId: string
}

export interface Captain {
  id: string
  user: User
  tier: Tier
  role: PlayerRole
  credits: number
  agents: CaptainAgent[]
  players: Player[]
  pickedTiers: CaptainPickedTier[]
  pickedPlayers: Player[]
}

export interface ViewCaptain {
  id: string
  user: User
  tier: Tier
  credits: number
  role: PlayerRole
  agents: CaptainAgent[]
  players: Player[]
  pickedTiers: CaptainPickedTier[]
}

export interface Tournament {
  id: string
  name: string
  code: string
  status: TournamentStatus
  createdAt: Date
  hostId: string | undefined
  host: User | undefined
  players: Player[]
  captains: Captain[]
}

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
  roundInitialCredits?: Map<string, number> // Add this line
}

export interface AuctionHistoryItem {
  playerId: string
  playerName: string
  captainId: string
  captainName: string
  finalBid: number
  timestamp: Date
}

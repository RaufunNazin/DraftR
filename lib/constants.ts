import type { Agent, PlayerRole } from "./types"

export const ROLES: PlayerRole[] = ["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL", "FLEX"]

export const AGENTS: Agent[] = [
  // Duelists
  "Jett",
  "Phoenix",
  "Raze",
  "Reyna",
  "Yoru",
  "Neon",
  "Iso",
  "Waylay",
  // Initiators
  "Sova",
  "Breach",
  "Skye",
  "KAY/O",
  "Fade",
  "Gekko",
  "Tejo",
  // Controllers
  "Brimstone",
  "Omen",
  "Viper",
  "Astra",
  "Harbor",
  "Clove",
  // Sentinels
  "Killjoy",
  "Cypher",
  "Sage",
  "Chamber",
  "Deadlock",
  "Vyse"
]

export const TIER_STARTING_PRICES = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
}

export const TIER_STARTING_CREDITS = {
  1: 200,
  2: 275,
  3: 350,
  4: 425,
  5: 500,
}

export const BID_INCREMENTS = [1, 5, 10]

export const AUCTION_TIMER_SECONDS = 30
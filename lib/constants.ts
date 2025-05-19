import type { Agent, Role } from "./types"

export const ROLES: Role[] = ["Duelist", "Initiator", "Controller", "Sentinel"]

export const AGENTS: Agent[] = [
  // Duelists
  "Jett",
  "Phoenix",
  "Raze",
  "Reyna",
  "Yoru",
  "Neon",
  "Iso",
  // Initiators
  "Sova",
  "Breach",
  "Skye",
  "KAY/O",
  "Fade",
  "Gekko",
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

export const MOCK_PLAYERS = [
  // Tier 1 Players
  { name: "TenZ", tier: 1, role: "Duelist", agents: ["Jett", "Reyna", "Raze"] },
  { name: "Yay", tier: 1, role: "Duelist", agents: ["Jett", "Chamber", "Reyna"] },
  { name: "Derke", tier: 1, role: "Duelist", agents: ["Jett", "Raze", "Reyna"] },
  { name: "Cryocells", tier: 1, role: "Duelist", agents: ["Jett", "Chamber", "Operator"] },
  { name: "Aspas", tier: 1, role: "Duelist", agents: ["Jett", "Raze", "Reyna"] },

  // Tier 2 Players
  { name: "Boaster", tier: 2, role: "Controller", agents: ["Astra", "Omen", "Brimstone"] },
  { name: "Marved", tier: 2, role: "Controller", agents: ["Astra", "Omen", "Brimstone"] },
  { name: "Sacy", tier: 2, role: "Initiator", agents: ["Sova", "Fade", "Breach"] },
  { name: "Shao", tier: 2, role: "Initiator", agents: ["Sova", "Fade", "Breach"] },
  { name: "Chronicle", tier: 2, role: "Sentinel", agents: ["Killjoy", "Chamber", "Cypher"] },

  // Tier 3 Players
  { name: "Crashies", tier: 3, role: "Initiator", agents: ["Sova", "KAY/O", "Skye"] },
  { name: "Ardiis", tier: 3, role: "Duelist", agents: ["Jett", "Chamber", "Operator"] },
  { name: "Ange1", tier: 3, role: "Controller", agents: ["Omen", "Brimstone", "Viper"] },
  { name: "Mistic", tier: 3, role: "Controller", agents: ["Viper", "Omen", "Brimstone"] },
  { name: "Nivera", tier: 3, role: "Sentinel", agents: ["Killjoy", "Cypher", "Sage"] },

  // Tier 4 Players
  { name: "Subroza", tier: 4, role: "Duelist", agents: ["Skye", "Phoenix", "Reyna"] },
  { name: "Hiko", tier: 4, role: "Initiator", agents: ["Sova", "Viper", "Breach"] },
  { name: "Scream", tier: 4, role: "Duelist", agents: ["Jett", "Reyna", "Phoenix"] },
  { name: "Sinatraa", tier: 4, role: "Duelist", agents: ["Raze", "Sova", "Phoenix"] },
  { name: "Shahzam", tier: 4, role: "Initiator", agents: ["Jett", "Sova", "Operator"] },

  // Tier 5 Players
  { name: "Steel", tier: 5, role: "Sentinel", agents: ["Killjoy", "Cypher", "Sage"] },
  { name: "Dapr", tier: 5, role: "Sentinel", agents: ["Cypher", "Killjoy", "Chamber"] },
  { name: "Zombs", tier: 5, role: "Controller", agents: ["Astra", "Omen", "Brimstone"] },
  { name: "Sick", tier: 5, role: "Flex", agents: ["Phoenix", "Sage", "Raze"] },
  { name: "Nitro", tier: 5, role: "Controller", agents: ["Omen", "Viper", "Astra"] },
]

export const MOCK_CAPTAINS = [
  {
    id: "captain-1",
    name: "FNS",
    tier: 1,
    role: "Controller",
    agents: ["Omen", "Brimstone", "Viper"],
    credits: TIER_STARTING_CREDITS[1],
  },
  {
    id: "captain-2",
    name: "Vanity",
    tier: 2,
    role: "Controller",
    agents: ["Omen", "Brimstone", "Astra"],
    credits: TIER_STARTING_CREDITS[2],
  },
  {
    id: "captain-3",
    name: "Dephh",
    tier: 3,
    role: "Sentinel",
    agents: ["Cypher", "Killjoy", "Chamber"],
    credits: TIER_STARTING_CREDITS[3],
  },
  {
    id: "captain-4",
    name: "Zander",
    tier: 4,
    role: "Controller",
    agents: ["Omen", "Astra", "Harbor"],
    credits: TIER_STARTING_CREDITS[4],
  },
  {
    id: "captain-5",
    name: "Poised",
    tier: 5,
    role: "Duelist",
    agents: ["Jett", "Raze", "Reyna"],
    credits: TIER_STARTING_CREDITS[5],
  },
]

export const BID_INCREMENTS = [1, 5, 10]

export const AUCTION_TIMER_SECONDS = 30

export const MOCK_TOURNAMENTS = [
  {
    id: "tournament-1",
    name: "VCT Champions 2023",
    code: "VCT23",
    status: "active",
    createdAt: Date.now() - 86400000, // 1 day ago
    hostId: "host-1",
  },
  {
    id: "tournament-2",
    name: "Valorant Masters Tokyo",
    code: "VMTK",
    status: "upcoming",
    createdAt: Date.now() - 172800000, // 2 days ago
    hostId: "host-1",
  },
  {
    id: "tournament-3",
    name: "Challengers NA 2023",
    code: "CNA23",
    status: "completed",
    createdAt: Date.now() - 604800000, // 7 days ago
    hostId: "host-1",
  },
]

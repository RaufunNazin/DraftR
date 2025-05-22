import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerRole, Tier } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRoleBadgeClass(role: PlayerRole): string {
  switch (role) {
    case "DUELIST":
      return "role-duelist"
    case "INITIATOR":
      return "role-initiator"
    case "CONTROLLER":
      return "role-controller"
    case "SENTINEL":
      return "role-sentinel"
    case "FLEX":
      return "role-flex"
    default:
      return ""
  }
}

export function getTierBadgeClass(tier: Tier): string {
  return `tier-${tier}`
}

export function getCaptainAvatarClass(tier: Tier): string {
  return `captain-avatar captain-tier-${tier}`
}

export function formatCredits(credits: number): string {
  return new Intl.NumberFormat("en-US").format(credits)
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function canCaptainBid(
  captainTier: Tier,
  captainRoundInitialCredits: number,
  playerTier: Tier,
  currentBid: number,
  pickedTiers: Tier[],
): boolean {
  // Captain can't bid on their own tier
  if (captainTier === playerTier) {
    return false
  }

  // Captain can't bid on a tier they've already picked from
  if (pickedTiers.includes(playerTier)) {
    return false
  }

  // Captain must have enough credits for the next possible bid.
  // Assumes the smallest increment is 1. So, credits must be > currentBid.
  // Or, cannot bid if credits <= currentBid (if currentBid > 0)
  // or if credits < 1 (if currentBid is 0).
  // This simplifies to: captain needs more credits than the current highest bid.
  if (captainRoundInitialCredits <= currentBid) {
    return false;
  }

  return true
}

export function getRandomColor(): string {
  const colors = [
    "from-red-500 to-orange-500",
    "from-orange-500 to-yellow-500",
    "from-yellow-500 to-green-500",
    "from-green-500 to-blue-500",
    "from-blue-500 to-indigo-500",
    "from-indigo-500 to-purple-500",
    "from-purple-500 to-pink-500",
    "from-pink-500 to-red-500",
  ]

  return colors[Math.floor(Math.random() * colors.length)]
}

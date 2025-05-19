"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { TIER_STARTING_PRICES } from "@/lib/constants"
import type { Agent, PlayerRole, Tier } from "@/lib/types"

/**
 * Get players for a tournament
 */
export async function getPlayers(tournamentId: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to view players" }
  }

  try {
    const players = await prisma.player.findMany({
      where: { tournamentId },
      include: {
        agents: true,
        captain: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    })

    return { success: true, players }
  } catch (error) {
    console.error("Error getting players:", error)
    return { success: false, error: "Failed to get players" }
  }
}

/**
 * Add player to tournament
 */
export async function addPlayer(tournamentId: string, name: string, tier: Tier, role: PlayerRole, agents: Agent[]) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to add players" }
  }

  // Check if user is an admin or the tournament host
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { hostId: true },
  })

  if (!tournament) {
    return { success: false, error: "Tournament not found" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || (user.role !== "ADMIN" && tournament.hostId !== session.user.id)) {
    return { success: false, error: "Only admins or the tournament host can add players" }
  }

  try {
    // Calculate starting price based on tier
    const startingPrice = TIER_STARTING_PRICES[tier] || 50

    // Create player
    const player = await prisma.player.create({
      data: {
        name,
        tier,
        role,
        startingPrice,
        tournamentId,
        agents: {
          create: agents.map((agent) => ({
            agent,
          })),
        },
      },
    })

    revalidatePath(`/admin/tournaments/${tournamentId}`)
    return { success: true, playerId: player.id }
  } catch (error) {
    console.error("Error adding player:", error)
    return { success: false, error: "Failed to add player" }
  }
}

/**
 * Remove player from tournament
 */
export async function removePlayer(playerId: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to remove players" }
  }

  try {
    // Get player and tournament
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        tournament: {
          select: { hostId: true, id: true },
        },
      },
    })

    if (!player) {
      return { success: false, error: "Player not found" }
    }

    // Check if user is an admin or the tournament host
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || (user.role !== "ADMIN" && player.tournament.hostId !== session.user.id)) {
      return { success: false, error: "Only admins or the tournament host can remove players" }
    }

    // Check if player is already assigned to a captain
    if (player.captainId) {
      return { success: false, error: "Cannot remove a player that is already assigned to a captain" }
    }

    // Delete player
    await prisma.player.delete({
      where: { id: playerId },
    })

    revalidatePath(`/admin/tournaments/${player.tournament.id}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing player:", error)
    return { success: false, error: "Failed to remove player" }
  }
}

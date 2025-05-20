"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * Generate a random 4-character tournament code
 */
function generateTournamentCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

/**
 * Create a new tournament
 */
export async function createTournament(name: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to create a tournament" }
  }

  // Check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can create tournaments" }
  }

  if (!name || name.trim() === "") {
    return { success: false, error: "Tournament name is required" }
  }

  try {
    // Generate a unique tournament code
    let code = ""
    let isCodeUnique = false

    while (!isCodeUnique) {
      code = generateTournamentCode()
      const existingTournament = await prisma.tournament.findUnique({
        where: { code },
      })

      if (!existingTournament) {
        isCodeUnique = true
      }
    }

    // Create the tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        code,
        hostId: session.user.id,
        status: "UPCOMING",
      },
    })

    revalidatePath("/dashboard")
    return { success: true, id: tournament.id, code: tournament.code }
  } catch (error) {
    console.error("Error creating tournament:", error)
    return { success: false, error: "Failed to create tournament" }
  }
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(id: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to view tournament details" }
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
        players: {
          include: {
            agents: true,
          },
        },
        captains: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            agents: true,
            players: {
              include: {
                agents: true,
              },
            },
            pickedTiers: true,
          },
        },
      },
    })

    if (!tournament) {
      return { success: false, error: "Tournament not found" }
    }

    return { success: true, tournament }
  } catch (error) {
    console.error("Error getting tournament:", error)
    return { success: false, error: "Failed to get tournament details" }
  }
}

/**
 * Get tournament by code
 */
export async function getTournamentByCode(code: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to view tournament details" }
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { code },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        players: {
          include: {
            agents: true,
          },
        },
        captains: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            agents: true,
            players: {
              include: {
                agents: true,
              },
            },
            pickedTiers: true,
          },
        },
      },
    })

    if (!tournament) {
      return { success: false, error: "Tournament not found" }
    }

    return { success: true, tournament }
  } catch (error) {
    console.error("Error getting tournament:", error)
    return { success: false, error: "Failed to get tournament details" }
  }
}

/**
 * Get all tournaments for the current user
 */
export async function getTournaments() {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to view tournaments" }
  }

  try {
    let tournaments = []

    // If user is admin, get all tournaments
    if (session.user.role === "ADMIN") {
      tournaments = await prisma.tournament.findMany({
        include: {
          host: {
            select: {
              id: true,
              name: true,
            },
          },
          players: true,
          captains: true,
          participants: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } else {
      // Get tournaments where user is a participant or host
      tournaments = await prisma.tournament.findMany({
        where: {
          OR: [
            { hostId: session.user.id },
            {
              participants: {
                some: {
                  id: session.user.id,
                },
              },
            },
          ],
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
            },
          },
          players: true,
          captains: true,
          participants: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }

    return { success: true, tournaments }
  } catch (error) {
    console.error("Error getting tournaments:", error)
    return { success: false, error: "Failed to get tournaments" }
  }
}

/**
 * Join tournament as audience
 */
export async function joinTournamentByCode(code: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to join a tournament" }
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { code },
    })

    if (!tournament) {
      return { success: false, error: "Tournament not found" }
    }

    // Add user to tournament participants if not already a participant
    const isParticipant = await prisma.tournament.findFirst({
      where: {
        id: tournament.id,
        participants: {
          some: {
            id: session.user.id,
          },
        },
      },
    })

    if (!isParticipant) {
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          participants: {
            connect: { id: session.user.id },
          },
        },
      })
    }

    revalidatePath("/dashboard")
    return { success: true, tournamentId: tournament.id }
  } catch (error) {
    console.error("Error joining tournament:", error)
    return { success: false, error: "Failed to join tournament" }
  }
}

/**
 * Delete a tournament
 */
export async function deleteTournament(id: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to delete a tournament" }
  }

  // Check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can delete tournaments" }
  }

  try {
    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        captains: true,
        players: true,
      },
    })

    if (!tournament) {
      return { success: false, error: "Tournament not found" }
    }

    // Use a transaction to ensure all related data is properly cleaned up
    await prisma.$transaction(async (tx) => {
      // Delete auction history if it exists
      const auction = await tx.auction.findUnique({
        where: { tournamentId: id },
      })

      if (auction) {
        await tx.auctionHistory.deleteMany({
          where: { auctionId: auction.id },
        })

        await tx.auctionBid.deleteMany({
          where: { auctionId: auction.id },
        })

        await tx.auctionSkipVote.deleteMany({
          where: { auctionId: auction.id },
        })

        await tx.auction.delete({
          where: { id: auction.id },
        })
      }

      // Delete captain picked tiers
      for (const captain of tournament.captains) {
        await tx.captainPickedTier.deleteMany({
          where: { captainId: captain.id },
        })
      }

      // Delete player agents
      for (const player of tournament.players) {
        await tx.playerAgent.deleteMany({
          where: { playerId: player.id },
        })
      }

      // Delete players
      await tx.player.deleteMany({
        where: { tournamentId: id },
      })

      // Delete captains
      await tx.captain.deleteMany({
        where: { tournamentId: id },
      })

      // Remove tournament participants
      await tx.tournament.update({
        where: { id },
        data: {
          participants: {
            set: [],
          },
        },
      })

      // Finally delete the tournament
      await tx.tournament.delete({
        where: { id },
      })
    })

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Error deleting tournament:", error)
    return { success: false, error: "Failed to delete tournament" }
  }
}

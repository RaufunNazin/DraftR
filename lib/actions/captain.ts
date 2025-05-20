"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { TIER_STARTING_CREDITS } from "@/lib/constants";
import type { PlayerRole, Tier } from "@/lib/types";

/**
 * Get captains for a tournament
 */
export async function getCaptains(tournamentId: string) {
  const session = await auth();

  if (!session || !session.user) {
    return { success: false, error: "You must be logged in to view captains" };
  }

  try {
    const captains = await prisma.captain.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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
      orderBy: [
        { tier: "asc" },
        {
          user: {
            name: "asc",
          },
        },
      ],
    });

    return { success: true, captains };
  } catch (error) {
    console.error("Error getting captains:", error);
    return { success: false, error: "Failed to get captains" };
  }
}

/**
 * Get available users for captain assignment
 */
export async function getAvailableUsers(tournamentId: string) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: "You must be logged in to view available users",
    };
  }

  try {
    // Get users who are participants but not already captains in this tournament
    const users = await prisma.user.findMany({
      where: {
        OR: [{ role: "CAPTAIN" }, { role: "ADMIN" }],
        captainProfile: {
          is: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error getting available users:", error);
    return { success: false, error: "Failed to get available users" };
  }
}

/**
 * Assign a user as a captain
 */
export async function assignCaptain(
  tournamentId: string,
  userId: string,
  tier: Tier,
  role: PlayerRole
) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: "You must be logged in to assign captains",
    };
  }

  // Check if user is an admin or the tournament host
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { hostId: true },
  });

  if (!tournament) {
    return { success: false, error: "Tournament not found" };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (
    !currentUser ||
    (currentUser.role !== "ADMIN" && tournament.hostId !== session.user.id)
  ) {
    return {
      success: false,
      error: "Only admins or the tournament host can assign captains",
    };
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if user is already a captain in this tournament
    const existingCaptain = await prisma.captain.findFirst({
      where: {
        userId,
        tournamentId,
      },
    });

    if (existingCaptain) {
      return {
        success: false,
        error: "User is already a captain in this tournament",
      };
    }

    // Calculate starting credits based on tier
    const credits = TIER_STARTING_CREDITS[tier] || 300;

    // Create captain
    const captain = await prisma.captain.create({
      data: {
        userId,
        tournamentId,
        tier,
        role: role as PlayerRole,
        credits,
      },
    });

    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true, captainId: captain.id };
  } catch (error) {
    console.error("Error assigning captain:", error);
    return { success: false, error: "Failed to assign captain" };
  }
}

/**
 * Remove a captain
 */
export async function removeCaptain(captainId: string) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: "You must be logged in to remove captains",
    };
  }

  try {
    // Get captain and tournament
    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
      include: {
        tournament: {
          select: { hostId: true, id: true },
        },
        players: true,
      },
    });

    if (!captain) {
      return { success: false, error: "Captain not found" };
    }

    // Check if user is an admin or the tournament host
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (
      !user ||
      (user.role !== "ADMIN" && captain.tournament.hostId !== session.user.id)
    ) {
      return {
        success: false,
        error: "Only admins or the tournament host can remove captains",
      };
    }

    // Check if captain has players
    if (captain.players.length > 0) {
      return {
        success: false,
        error: "Cannot remove a captain that has players assigned",
      };
    }

    // Delete captain
    await prisma.captain.delete({
      where: { id: captainId },
    });

    revalidatePath(`/admin/tournaments/${captain.tournament.id}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing captain:", error);
    return { success: false, error: "Failed to remove captain" };
  }
}

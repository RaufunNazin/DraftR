"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import type { BidMode } from "@prisma/client"

/**
 * Start auction
 */
export async function startAuction(tournamentId: string) {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error("You must be logged in to start an auction")
  }

  // Check if user is the tournament host
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { hostId: true },
  })

  if (!tournament || tournament.hostId !== session.user.id) {
    throw new Error("Only the tournament host can start the auction")
  }

  // Check if there are players in the tournament before starting
  const playerCount = await prisma.player.count({
    where: {
      tournamentId,
      captainId: null, // Only count unassigned players
    }
  })

  if (playerCount === 0) {
    throw new Error("Cannot start auction - no available players found")
  }

  // Check if auction already exists
  const existingAuction = await prisma.auction.findUnique({
    where: { tournamentId },
  })

  if (existingAuction) {
    // Update existing auction
    await prisma.auction.update({
      where: { id: existingAuction.id },
      data: {
        isActive: true,
        startedAt: new Date(),
        isPaused: false,
      },
    })
  } else {
    // Create new auction
    await prisma.auction.create({
      data: {
        tournamentId,
        isActive: true,
        startedAt: new Date(),
        bidMode: "OPEN",
        timerSeconds: 30,
      },
    })

    // Update tournament status
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
      },
    })
  }

  revalidatePath(`/auction?tournament=${tournamentId}`)
}

/**
 * Pause/resume auction
 */
export async function toggleAuctionPause(auctionId: string) {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error("You must be logged in to control the auction")
  }

  // Check if user is the tournament host
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      tournament: {
        select: { hostId: true, code: true },
      },
    },
  })

  if (!auction || auction.tournament.hostId !== session.user.id) {
    throw new Error("Only the tournament host can control the auction")
  }

  // Toggle pause state
  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      isPaused: !auction.isPaused,
    },
  })

  revalidatePath(`/auction?tournament=${auction.tournament.code}`)
}

/**
 * Change bid mode
 */
export async function changeBidMode(auctionId: string, mode: BidMode) {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error("You must be logged in to change bid mode")
  }

  // Check if user is the tournament host
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      tournament: {
        select: { hostId: true, code: true },
      },
    },
  })

  if (!auction || auction.tournament.hostId !== session.user.id) {
    throw new Error("Only the tournament host can change the bid mode")
  }

  // Update bid mode
  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      bidMode: mode,
    },
  })

  revalidatePath(`/auction?tournament=${auction.tournament.code}`)
}

/**
 * Place a bid
 */
export async function placeBid(auctionId: string, amount: number) {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error("You must be logged in to place a bid")
  }

  // Check if user is a captain
  const captain = await prisma.captain.findFirst({
    where: { userId: session.user.id },
    include: {
      pickedTiers: true,
    },
  })

  if (!captain) {
    throw new Error("Only captains can place bids")
  }

  // Get auction details
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      currentPlayer: true,
      tournament: {
        select: { code: true },
      },
    },
  })

  if (!auction || !auction.isActive || auction.isPaused) {
    throw new Error("Auction is not active")
  }

  if (!auction.currentPlayer) {
    throw new Error("No player is currently up for auction")
  }

  // Check if captain has enough credits
  if (captain.credits < amount) {
    throw new Error("Not enough credits")
  }

  // Check if captain is bidding on their own tier
  if (captain.tier === auction.currentPlayer.tier) {
    throw new Error("Cannot bid on your own tier")
  }

  // Check if captain already has a player from this tier
  const hasTier = captain.pickedTiers.some((pt) => pt.tier === auction.currentPlayer.tier)
  if (hasTier) {
    throw new Error("Already have a player from this tier")
  }

  // Create bid
  await prisma.auctionBid.create({
    data: {
      auctionId,
      captainId: captain.id,
      amount,
    },
  })

  revalidatePath(`/auction?tournament=${auction.tournament.code}`)
}

/**
 * Vote to skip player
 */
export async function voteToSkip(auctionId: string) {
  const session = await auth()

  if (!session || !session.user) {
    throw new Error("You must be logged in to vote")
  }

  // Check if user is a captain
  const captain = await prisma.captain.findFirst({
    where: { userId: session.user.id },
  })

  if (!captain) {
    throw new Error("Only captains can vote to skip")
  }

  // Get auction details
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      skipVotes: true,
      tournament: {
        select: { code: true },
      },
    },
  })

  if (!auction || !auction.isActive) {
    throw new Error("Auction is not active")
  }

  // Check if captain already voted
  const alreadyVoted = auction.skipVotes.some((vote) => vote.captainId === captain.id)
  if (alreadyVoted) {
    throw new Error("Already voted to skip")
  }

  // Add skip vote
  await prisma.auctionSkipVote.create({
    data: {
      auctionId,
      captainId: captain.id,
    },
  })

  revalidatePath(`/auction?tournament=${auction.tournament.code}`)
}

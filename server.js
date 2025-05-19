const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")
const { PrismaClient } = require("@prisma/client")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()
const prisma = new PrismaClient()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server)

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id)

    // Join a tournament room
    socket.on("join-tournament", async (tournamentCode) => {
      try {
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        socket.join(`tournament:${tournamentCode}`)
        console.log(`Socket ${socket.id} joined tournament ${tournamentCode}`)

        // Auto-initialize auction if it doesn't exist
        let auction = await prisma.auction.findUnique({
          where: { tournamentId: tournament.id },
        })

        if (!auction) {
          auction = await prisma.auction.create({
            data: {
              tournamentId: tournament.id,
              bidMode: "OPEN",
              timerSeconds: 30,
              currentTimer: 30,
              isActive: false,
              isPaused: false,
            },
          })
        }

        // Populate auction state
        const fullAuction = await prisma.auction.findUnique({
          where: { id: auction.id },
          include: {
            currentPlayer: { include: { agents: true } },
            bids: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                captain: {
                  select: {
                    id: true,
                    tier: true,
                    credits: true,
                    user: { select: { name: true } },
                  },
                },
              },
            },
            skipVotes: { include: { captain: true } },
          },
        })

        const captains = await prisma.captain.findMany({
          where: { tournamentId: tournament.id },
          include: {
            user: { select: { name: true } },
            pickedTiers: true,
            players: { include: { agents: true } },
            agents: true,
          },
        })

        const players = await prisma.player.findMany({
          where: {
            tournamentId: tournament.id,
            captainId: null,
          },
          include: { agents: true },
        })

        const history = await prisma.auctionHistory.findMany({
          where: { auctionId: auction.id },
          include: {
            player: { select: { name: true } },
            captain: { select: { user: { select: { name: true } } } },
          },
          orderBy: { timestamp: "desc" },
        })

        const auctionState = {
          isActive: fullAuction.isActive,
          isPaused: fullAuction.isPaused,
          bidMode: fullAuction.bidMode,
          timer: fullAuction.currentTimer,
          currentPlayer: fullAuction.currentPlayer,
          currentBid: fullAuction.bids[0]?.amount || fullAuction.currentPlayer?.startingPrice || 0,
          currentBidder: fullAuction.bids[0]?.captain || null,
          skipVotes: fullAuction.skipVotes.map((v) => v.captainId),
          captains,
          players,
          history: history.map((h) => ({
            playerId: h.playerId,
            playerName: h.player.name,
            captainId: h.captainId,
            captainName: h.captain.user.name,
            finalBid: h.finalBid,
            timestamp: h.timestamp,
          })),
        }

        socket.emit("auction:state", auctionState)
      } catch (error) {
        console.error("join-tournament error:", error)
        socket.emit("error", { message: "Failed to join tournament" })
      }
    })

    // Handle bid
    socket.on("auction:bid", async (data) => {
      try {
        const { tournamentCode, captainId, amount } = data

        // Validate tournament
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        // Get auction
        const auction = await prisma.auction.findUnique({
          where: { tournamentId: tournament.id },
          include: {
            currentPlayer: true,
          },
        })

        if (!auction || !auction.isActive || auction.isPaused) {
          socket.emit("error", { message: "Auction is not active" })
          return
        }

        if (!auction.currentPlayer) {
          socket.emit("error", { message: "No player is currently up for auction" })
          return
        }

        // Validate captain
        const captain = await prisma.captain.findFirst({
          where: {
            id: captainId,
            tournamentId: tournament.id,
          },
          include: {
            pickedTiers: true,
          },
        })

        if (!captain) {
          socket.emit("error", { message: "Captain not found" })
          return
        }

        // Check if captain has enough credits
        if (captain.credits < amount) {
          socket.emit("error", { message: "Not enough credits" })
          return
        }

        // Check if captain is bidding on their own tier
        if (captain.tier === auction.currentPlayer.tier) {
          socket.emit("error", { message: "Cannot bid on your own tier" })
          return
        }

        // Check if captain already has a player from this tier
        const hasTier = captain.pickedTiers.some((pt) => pt.tier === auction.currentPlayer.tier)
        if (hasTier) {
          socket.emit("error", { message: "Already have a player from this tier" })
          return
        }

        // Create bid
        const bid = await prisma.auctionBid.create({
          data: {
            auctionId: auction.id,
            captainId: captain.id,
            amount,
          },
          include: {
            captain: {
              select: {
                id: true,
                tier: true,
                credits: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })

        // Reset timer
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            currentTimer: auction.timerSeconds,
          },
        })

        // Broadcast bid to all clients in the tournament room
        io.to(`tournament:${tournamentCode}`).emit("auction:bid", {
          amount: bid.amount,
          captainId: bid.captainId,
          captainName: bid.captain.user.name,
          captainTier: bid.captain.tier,
          captainCredits: bid.captain.credits,
        })
      } catch (error) {
        console.error("Error processing bid:", error)
        socket.emit("error", { message: "Failed to process bid" })
      }
    })

    // Handle skip vote
    socket.on("auction:skip", async (data) => {
      try {
        const { tournamentCode, captainId } = data

        // Validate tournament
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        // Get auction
        const auction = await prisma.auction.findUnique({
          where: { tournamentId: tournament.id },
          include: {
            skipVotes: true,
          },
        })

        if (!auction || !auction.isActive) {
          socket.emit("error", { message: "Auction is not active" })
          return
        }

        // Validate captain
        const captain = await prisma.captain.findFirst({
          where: {
            id: captainId,
            tournamentId: tournament.id,
          },
        })

        if (!captain) {
          socket.emit("error", { message: "Captain not found" })
          return
        }

        // Check if captain already voted
        const alreadyVoted = auction.skipVotes.some((vote) => vote.captainId === captainId)
        if (alreadyVoted) {
          socket.emit("error", { message: "Already voted to skip" })
          return
        }

        // Add skip vote
        await prisma.auctionSkipVote.create({
          data: {
            auctionId: auction.id,
            captainId,
          },
        })

        // Get updated skip votes
        const updatedSkipVotes = await prisma.auctionSkipVote.findMany({
          where: { auctionId: auction.id },
          select: { captainId: true },
        })

        // Broadcast skip votes to all clients in the tournament room
        io.to(`tournament:${tournamentCode}`).emit("auction:skip", {
          skipVotes: updatedSkipVotes.map((vote) => vote.captainId),
        })

        // Check if majority of captains voted to skip
        const captainCount = await prisma.captain.count({
          where: { tournamentId: tournament.id },
        })

        if (updatedSkipVotes.length > Math.floor(captainCount / 2)) {
          // Skip the current player
          await skipCurrentPlayer(auction.id, tournamentCode, io)
        }
      } catch (error) {
        console.error("Error processing skip vote:", error)
        socket.emit("error", { message: "Failed to process skip vote" })
      }
    })

    // Handle bid mode change
    socket.on("auction:mode", async (data) => {
      try {
        const { tournamentCode, mode } = data

        // Validate tournament
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        // Update auction bid mode
        await prisma.auction.update({
          where: { tournamentId: tournament.id },
          data: { bidMode: mode },
        })

        // Broadcast bid mode change to all clients in the tournament room
        io.to(`tournament:${tournamentCode}`).emit("auction:mode", { mode })
      } catch (error) {
        console.error("Error changing bid mode:", error)
        socket.emit("error", { message: "Failed to change bid mode" })
      }
    })

    // Handle auction start
    socket.on("auction:start", async (data) => {
      try {
        const { tournamentCode } = data

        // Validate tournament
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        // Check if auction already exists
        let auction = await prisma.auction.findUnique({
          where: { tournamentId: tournament.id },
        })

        if (auction) {
          // Update existing auction
          auction = await prisma.auction.update({
            where: { id: auction.id },
            data: {
              isActive: true,
              startedAt: new Date(),
              isPaused: false,
            },
          })
        } else {
          // Create new auction
          auction = await prisma.auction.create({
            data: {
              tournamentId: tournament.id,
              isActive: true,
              startedAt: new Date(),
              bidMode: "OPEN",
              timerSeconds: 30,
              currentTimer: 30,
            },
          })

          // Update tournament status
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: {
              status: "ACTIVE",
              startedAt: new Date(),
            },
          })
        }

        // Select first player
        await selectNextPlayer(auction.id, tournamentCode, io)

        // Broadcast auction start to all clients in the tournament room
        io.to(`tournament:${tournamentCode}`).emit("auction:start", { isActive: true })

        // Start the auction timer
        startAuctionTimer(auction.id, tournamentCode, io)
      } catch (error) {
        console.error("Error starting auction:", error)
        socket.emit("error", { message: "Failed to start auction" })
      }
    })

    // Handle auction pause/resume
    socket.on("auction:pause", async (data) => {
      try {
        const { tournamentCode, isPaused } = data

        // Validate tournament
        const tournament = await prisma.tournament.findUnique({
          where: { code: tournamentCode },
        })

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" })
          return
        }

        // Update auction pause state
        await prisma.auction.update({
          where: { tournamentId: tournament.id },
          data: { isPaused },
        })

        // Broadcast pause state to all clients in the tournament room
        io.to(`tournament:${tournamentCode}`).emit("auction:pause", { isPaused })
      } catch (error) {
        console.error("Error pausing/resuming auction:", error)
        socket.emit("error", { message: "Failed to pause/resume auction" })
      }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id)
    })
  })

  // Start the server
  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})

// Helper function to select the next player for auction
async function selectNextPlayer(auctionId, tournamentCode, io) {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        tournament: true,
      },
    })

    if (!auction) return

    // Get available players (not assigned to any captain)
    const availablePlayers = await prisma.player.findMany({
      where: {
        tournamentId: auction.tournament.id,
        captainId: null,
      },
    })

    if (availablePlayers.length === 0) {
      // No more players, end the auction
      await prisma.auction.update({
        where: { id: auctionId },
        data: {
          isActive: false,
          endedAt: new Date(),
          currentPlayerId: null,
        },
      })

      await prisma.tournament.update({
        where: { id: auction.tournament.id },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      })

      io.to(`tournament:${tournamentCode}`).emit("auction:complete", { isActive: false })
      return
    }

    // Select a random player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length)
    const nextPlayer = availablePlayers[randomIndex]

    // Update auction with the new player
    await prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentPlayerId: nextPlayer.id,
        currentTimer: auction.timerSeconds,
      },
    })

    // Clear any existing bids and skip votes for the new player
    await prisma.auctionBid.deleteMany({
      where: { auctionId },
    })

    await prisma.auctionSkipVote.deleteMany({
      where: { auctionId },
    })

    // Get the player with agents
    const playerWithAgents = await prisma.player.findUnique({
      where: { id: nextPlayer.id },
      include: {
        agents: true,
      },
    })

    // Broadcast the new player to all clients in the tournament room
    io.to(`tournament:${tournamentCode}`).emit("auction:player", {
      player: {
        id: playerWithAgents.id,
        name: playerWithAgents.name,
        tier: playerWithAgents.tier,
        role: playerWithAgents.role,
        startingPrice: playerWithAgents.startingPrice,
        agents: playerWithAgents.agents.map((a) => a.agent),
      },
      currentBid: playerWithAgents.startingPrice,
      currentBidder: null,
    })
  } catch (error) {
    console.error("Error selecting next player:", error)
  }
}

// Helper function to skip the current player
async function skipCurrentPlayer(auctionId, tournamentCode, io) {
  try {
    // Clear skip votes
    await prisma.auctionSkipVote.deleteMany({
      where: { auctionId },
    })

    // Select next player
    await selectNextPlayer(auctionId, tournamentCode, io)
  } catch (error) {
    console.error("Error skipping player:", error)
  }
}

// Helper function to handle auction timer
async function startAuctionTimer(auctionId, tournamentCode, io) {
  let intervalId = null

  const runTimer = async () => {
    try {
      // Get current auction state
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          currentPlayer: true,
          bids: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      })

      if (!auction || !auction.isActive || !auction.currentPlayer) {
        clearInterval(intervalId)
        return
      }

      // If paused, don't decrement timer
      if (auction.isPaused) {
        return
      }

      // Decrement timer
      const newTimer = auction.currentTimer - 1

      // Update timer in database
      await prisma.auction.update({
        where: { id: auctionId },
        data: { currentTimer: newTimer },
      })

      // Broadcast timer update
      io.to(`tournament:${tournamentCode}`).emit("auction:timer", { timer: newTimer })

      // Check if timer expired
      if (newTimer <= 0) {
        clearInterval(intervalId)

        // If there's a bid, complete the auction for this player
        if (auction.bids.length > 0) {
          const highestBid = auction.bids[0]

          // Get captain
          const captain = await prisma.captain.findUnique({
            where: { id: highestBid.captainId },
          })

          if (captain) {
            // Update captain's credits
            await prisma.captain.update({
              where: { id: captain.id },
              data: {
                credits: captain.credits - highestBid.amount,
                pickedTiers: {
                  create: {
                    tier: auction.currentPlayer.tier,
                  },
                },
              },
            })

            // Assign player to captain
            await prisma.player.update({
              where: { id: auction.currentPlayer.id },
              data: {
                captainId: captain.id,
              },
            })

            // Create auction history entry
            await prisma.auctionHistory.create({
              data: {
                auctionId,
                playerId: auction.currentPlayer.id,
                captainId: captain.id,
                finalBid: highestBid.amount,
              },
            })

            // Get updated captain with user info
            const updatedCaptain = await prisma.captain.findUnique({
              where: { id: captain.id },
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            })

            // Broadcast auction completion
            io.to(`tournament:${tournamentCode}`).emit("auction:complete", {
              playerId: auction.currentPlayer.id,
              playerName: auction.currentPlayer.name,
              captainId: captain.id,
              captainName: updatedCaptain.user.name,
              finalBid: highestBid.amount,
              timestamp: new Date(),
            })
          }
        }

        // Wait a moment before selecting the next player
        setTimeout(() => {
          selectNextPlayer(auctionId, tournamentCode, io)
          // Restart timer for next player
          startAuctionTimer(auctionId, tournamentCode, io)
        }, 3000)
      }
    } catch (error) {
      console.error("Error in auction timer:", error)
      clearInterval(intervalId)
    }
  }

  // Run the timer every second
  intervalId = setInterval(runTimer, 1000)
}

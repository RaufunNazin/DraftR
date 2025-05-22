const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const NodeCache = require("node-cache");
const Redis = require("ioredis");
const cluster = require("cluster");
const os = require("os");
const { createAdapter } = require("@socket.io/redis-adapter");

// Environment setup
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Redis setup for shared state between workers
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = new Redis(redisUrl);
const redisPub = new Redis(redisUrl);
const redisSub = new Redis(redisUrl);

// Create a single Prisma instance for the entire application
const prisma = new PrismaClient({
  // Add connection pooling for better performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Log only errors in production
  log: dev ? ["query", "error", "warn"] : ["error"],
});

// In-memory cache for frequently accessed data
// Standard TTL of 5 minutes, check period of 10 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Tournament room data cache - shared via Redis in production
const tournamentCache = new Map();

// Active timers tracking
const activeTimers = new Map();
const pausedTimers = new Map(); // Store pause state and time

// Pending database operations queue
const dbQueue = new Map();

if (dev) {
  // In development, clear Redis cache on startup
  redisClient.flushdb((err, succeeded) => {
    if (err) {
      console.error("Error clearing Redis cache:", err);
    } else {
      console.log("Redis cache cleared");
    }
  });

  // Clear in-memory cache
  cache.flushAll();
  console.log("In-memory cache cleared");

  startServer();
}

function startServer() {
  app.prepare().then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    const io = new Server(server, {
      // Optimize Socket.IO settings
      pingTimeout: 30000,
      pingInterval: 25000,
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
      },
      // Increase performance with binary transport
      transports: ["websocket", "polling"],
      // Adapter for scaling across multiple servers/workers
      adapter: createAdapter(redisPub, redisSub),
    });

    // Sync tournament cache with Redis in production
    if (!dev) {
      // Subscribe to tournament cache updates
      redisSub.subscribe("tournament-cache-update");
      redisSub.on("message", (channel, message) => {
        if (channel === "tournament-cache-update") {
          const { tournamentCode, data } = JSON.parse(message);
          tournamentCache.set(tournamentCode, data);
        }
      });
    }

    // Socket.IO connection handler
    io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id} on worker ${process.pid}`);

      // Join a tournament room
      socket.on("join-tournament", async (tournamentCode) => {
        try {
          // Check cache first
          let tournament = cache.get(`tournament:${tournamentCode}`);

          if (!tournament) {
            tournament = await prisma.tournament.findUnique({
              where: { code: tournamentCode },
            });

            if (tournament) {
              // Cache tournament for 5 minutes
              cache.set(`tournament:${tournamentCode}`, tournament);
            }
          }

          if (!tournament) {
            socket.emit("error", { message: "Tournament not found" });
            return;
          }

          socket.join(`tournament:${tournamentCode}`);
          console.log(
            `Socket ${socket.id} joined tournament ${tournamentCode}`
          );

          // Check if we already have the auction state cached
          let auctionState = tournamentCache.get(tournamentCode);

          if (!auctionState) {
            // Auto-initialize auction if it doesn't exist
            let auction = await prisma.auction.findUnique({
              where: { tournamentId: tournament.id },
            });

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
              });
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
            });

            const captains = await prisma.captain.findMany({
              where: { tournamentId: tournament.id },
              include: {
                user: { select: { name: true } },
                pickedTiers: true,
                players: { include: { agents: true } },
                agents: true,
              },
            });

            const players = await prisma.player.findMany({
              where: {
                tournamentId: tournament.id,
                captainId: null,
              },
              include: { agents: true },
            });

            const history = await prisma.auctionHistory.findMany({
              where: { auctionId: auction.id },
              include: {
                player: { select: { name: true } },
                captain: { select: { user: { select: { name: true } } } },
              },
              orderBy: { timestamp: "desc" },
            });

            auctionState = {
              isActive: fullAuction.isActive,
              isPaused: fullAuction.isPaused,
              bidMode: fullAuction.bidMode,
              timer: fullAuction.currentTimer,
              currentPlayer: fullAuction.currentPlayer,
              currentBid:
                fullAuction.bids[0]?.amount ||
                fullAuction.currentPlayer?.startingPrice ||
                0,
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
              auctionId: auction.id,
              tournamentId: tournament.id,
              timerSeconds: auction.timerSeconds,
            };

            // Cache the auction state
            tournamentCache.set(tournamentCode, auctionState);

            // Sync with Redis in production
            if (!dev) {
              redisClient.publish(
                "tournament-cache-update",
                JSON.stringify({ tournamentCode, data: auctionState })
              );
            }
          }

          socket.emit("auction:state", auctionState);
        } catch (error) {
          console.error("join-tournament error:", error);
          socket.emit("error", { message: "Failed to join tournament" });
        }
      });

      // Handle bid
      socket.on("auction:bid", async (data) => {
        try {
          const { tournamentCode, captainId, amount } = data;
          const auctionState = tournamentCache.get(tournamentCode);

          if (!auctionState) {
            socket.emit("error", { message: "Tournament not found" });
            return;
          }

          if (
            !auctionState.isActive ||
            auctionState.isPaused ||
            !auctionState.currentPlayer
          ) {
            socket.emit("error", {
              message:
                "Auction is not active or is paused, or no current player.",
            });
            return;
          }

          const captainBidding = auctionState.captains.find(
            (c) => c.id === captainId
          );
          if (!captainBidding) {
            socket.emit("error", { message: "Captain not found" });
            return;
          }

          const roundInitialCredits = auctionState.roundInitialCredits;
          if (
            !roundInitialCredits ||
            typeof roundInitialCredits.get !== "function"
          ) {
            console.error(
              "Error: roundInitialCredits is not properly initialized in auctionState.",
              auctionState
            );
            socket.emit("error", {
              message: "Auction round not properly initialized. Contact admin.",
            });
            return;
          }

          const captainInitialCredits = roundInitialCredits.get(captainId);
          if (captainInitialCredits === undefined) {
            console.error(
              `Error: Initial credits not found for captain ${captainId}.`
            );
            socket.emit("error", {
              message:
                "Your initial credits for this round are missing. Contact admin.",
            });
            return;
          }

          // A bid must be higher than the current bid. If current bid is 0 (e.g. from startingPrice), any positive amount is fine.
          // If currentBid is based on startingPrice, the first bid must be >= startingPrice.
          // The client-side should enforce increments, server validates "higher than current" or "at least starting price".
          if (
            amount <= auctionState.currentBid &&
            auctionState.currentBid > 0
          ) {
            // Allow matching starting price if currentBid is startingPrice
            socket.emit("error", {
              message: "Bid must be higher than current bid.",
            });
            return;
          }
          if (
            auctionState.currentBid === 0 &&
            auctionState.currentPlayer.startingPrice > 0 &&
            amount < auctionState.currentPlayer.startingPrice
          ) {
            socket.emit("error", {
              message: `Bid must be at least the starting price of ${auctionState.currentPlayer.startingPrice}.`,
            });
            return;
          }

          if (captainInitialCredits < amount) {
            socket.emit("error", {
              message: `Not enough credits. You started this round with ${captainInitialCredits}.`,
            });
            return;
          }

          if (captainBidding.tier === auctionState.currentPlayer.tier) {
            socket.emit("error", { message: "Cannot bid on your own tier" });
            return;
          }

          if (
            captainBidding.pickedTiers &&
            captainBidding.pickedTiers.some(
              (pt) => pt.tier === auctionState.currentPlayer.tier
            )
          ) {
            socket.emit("error", {
              message: "Already have a player from this tier",
            });
            return;
          }

          // const oldBidderCaptainObject = auctionState.currentBidder; // This is the full captain object or null

          const updatedCaptains = auctionState.captains.map((c) => {
            const initialCreditsForThisCaptainInRound = roundInitialCredits.get(
              c.id
            );
            if (initialCreditsForThisCaptainInRound === undefined) {
              console.warn(
                `Warning: Initial credits missing for captain ${c.id} during bid processing. Using current actual credits as fallback for display.`
              );
              // This captain's credits in the display will be their actual current credits.
              return { ...c };
            }

            let newDisplayCredits = initialCreditsForThisCaptainInRound;
            if (c.id === captainId) {
              // This is the new current bidder
              newDisplayCredits = initialCreditsForThisCaptainInRound - amount;
            }
            // For other captains, their displayed credits during this player's bidding round
            // are their initial credits for this round.
            // This means if they were a previous bidder, their displayed credits "reset" to initial for the round.
            return { ...c, credits: newDisplayCredits }; // This 'credits' is for display during this round
          });

          const updatedAuctionState = {
            ...auctionState,
            currentBid: amount,
            currentBidder: captainBidding, // Store the full captain object as currentBidder
            captains: updatedCaptains, // Captains array now reflects display credits for the round
            timer: auctionState.timerSeconds || 30,
          };

          tournamentCache.set(tournamentCode, updatedAuctionState);

          if (!dev) {
            // For Redis, we might want to store the "actual" credits vs "display/round" credits separately
            // or ensure client understands the context of 'credits' in auctionState.
            // For now, this simplified state is pushed.
            redisClient.publish(
              "tournament-cache-update",
              JSON.stringify({ tournamentCode, data: updatedAuctionState })
            );
          }

          io.to(`tournament:${tournamentCode}`).emit(
            "auction:state",
            updatedAuctionState
          );

          // Persist the bid to the database
          await prisma.auctionBid.create({
            data: {
              auctionId: auctionState.auctionId,
              captainId: captainId,
              // playerId: auctionState.currentPlayer.id,
              amount: amount,
            },
          });

          await startAuctionTimer(
            auctionState.auctionId,
            tournamentCode,
            io,
            updatedAuctionState.timer
          );
        } catch (error) {
          console.error("Error processing bid:", error);
          socket.emit("error", {
            message: "Failed to process bid. Check server logs.",
          });
        }
      });

      // Handle skip vote
      socket.on("auction:skip", async (data) => {
        try {
          const { tournamentCode, captainId } = data;

          // Get cached auction state
          const auctionState = tournamentCache.get(tournamentCode);
          if (!auctionState) {
            socket.emit("error", { message: "Tournament not found" });
            return;
          }

          // Quick validation from cache
          if (!auctionState.isActive) {
            socket.emit("error", { message: "Auction is not active" });
            return;
          }

          // Find captain in cache
          const captain = auctionState.captains.find((c) => c.id === captainId);
          if (!captain) {
            socket.emit("error", { message: "Captain not found" });
            return;
          }

          // Check if captain already voted
          if (auctionState.skipVotes.includes(captainId)) {
            socket.emit("error", { message: "Already voted to skip" });
            return;
          }

          // Update local state first
          const updatedSkipVotes = [...auctionState.skipVotes, captainId];

          // Update cached auction state
          const updatedAuctionState = {
            ...auctionState,
            skipVotes: updatedSkipVotes,
          };

          tournamentCache.set(tournamentCode, updatedAuctionState);

          // Sync with Redis in production
          if (!dev) {
            redisClient.publish(
              "tournament-cache-update",
              JSON.stringify({ tournamentCode, data: updatedAuctionState })
            );
          }

          // Broadcast skip votes to all clients in the tournament room immediately
          io.to(`tournament:${tournamentCode}`).emit("auction:skip", {
            skipVotes: updatedSkipVotes,
          });

          // Then persist to database asynchronously
          const dbOperation = async () => {
            await prisma.auctionSkipVote.create({
              data: {
                auctionId: auctionState.auctionId,
                captainId,
              },
            });
          };

          // Execute the operation immediately
          await dbOperation();

          // Check if majority of captains voted to skip
          // Changed from Math.floor to Math.ceil for the threshold calculation
          const captainCount = auctionState.captains.length;
          const skipThreshold = Math.ceil(captainCount / 2);

          console.log(
            `Skip votes: ${updatedSkipVotes.length}/${skipThreshold} needed`
          );

          if (updatedSkipVotes.length >= skipThreshold) {
            // Skip the current player
            await skipCurrentPlayer(auctionState.auctionId, tournamentCode, io);
          }
        } catch (error) {
          console.error("Error processing skip vote:", error);
          socket.emit("error", { message: "Failed to process skip vote" });
        }
      });

      // Handle bid mode change
      socket.on("auction:mode", async (data) => {
        try {
          const { tournamentCode, mode } = data;

          // Get cached auction state
          const auctionState = tournamentCache.get(tournamentCode);
          if (!auctionState) {
            socket.emit("error", { message: "Tournament not found" });
            return;
          }

          // Update local state first
          const updatedAuctionState = {
            ...auctionState,
            bidMode: mode,
          };

          tournamentCache.set(tournamentCode, updatedAuctionState);

          // Sync with Redis in production
          if (!dev) {
            redisClient.publish(
              "tournament-cache-update",
              JSON.stringify({ tournamentCode, data: updatedAuctionState })
            );
          }

          // Broadcast bid mode change immediately
          io.to(`tournament:${tournamentCode}`).emit("auction:mode", { mode });

          // Then persist to database asynchronously
          const dbOperation = async () => {
            await prisma.auction.update({
              where: { id: auctionState.auctionId },
              data: { bidMode: mode },
            });
          };

          // Execute the operation immediately
          await dbOperation();
        } catch (error) {
          console.error("Error changing bid mode:", error);
          socket.emit("error", { message: "Failed to change bid mode" });
        }
      });

      // Handle auction start
      socket.on("auction:start", async (data) => {
        try {
          console.log("Received auction:start event with data:", data);
          const { tournamentCode } = data;

          if (!tournamentCode) {
            console.error("No tournament code provided in auction:start event");
            socket.emit("error", { message: "No tournament code provided" });
            return;
          }

          // Get cached auction state
          let auctionState = tournamentCache.get(tournamentCode);
          if (!auctionState) {
            console.log(
              "No cached auction state found, fetching from database"
            );
            // Fallback to database if not in cache
            const tournament = await prisma.tournament.findUnique({
              where: { code: tournamentCode },
            });

            if (!tournament) {
              socket.emit("error", { message: "Tournament not found" });
              return;
            }

            // Check if auction already exists
            let auction = await prisma.auction.findUnique({
              where: { tournamentId: tournament.id },
            });

            if (auction) {
              // Update existing auction
              auction = await prisma.auction.update({
                where: { id: auction.id },
                data: {
                  isActive: true,
                  startedAt: new Date(),
                  isPaused: false,
                },
              });
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
              });

              // Update tournament status
              await prisma.tournament.update({
                where: { id: tournament.id },
                data: {
                  status: "ACTIVE",
                  startedAt: new Date(),
                },
              });
            }

            // Initialize auction state
            auctionState = {
              isActive: true,
              isPaused: false,
              bidMode: "OPEN",
              timer: 30,
              currentPlayer: null,
              currentBid: 0,
              currentBidder: null,
              skipVotes: [],
              captains: [],
              players: [],
              history: [],
              auctionId: auction.id,
              tournamentId: tournament.id,
              timerSeconds: 30,
            };

            // Fetch full auction state
            const captains = await prisma.captain.findMany({
              where: { tournamentId: tournament.id },
              include: {
                user: { select: { name: true } },
                pickedTiers: true,
                players: { include: { agents: true } },
                agents: true,
              },
            });

            // Get all available players (not assigned to any captain)
            const players = await prisma.player.findMany({
              where: {
                tournamentId: tournament.id,
                captainId: null,
              },
              include: { agents: true },
            });

            console.log(
              `Found ${players.length} available players for tournament ${tournament.id}`
            );

            if (players.length === 0) {
              socket.emit("error", {
                message: "Cannot start auction - no available players found",
              });
              return;
            }

            auctionState.captains = captains;
            auctionState.players = players;

            // Cache the auction state
            tournamentCache.set(tournamentCode, auctionState);

            // Sync with Redis in production
            if (!dev) {
              redisClient.publish(
                "tournament-cache-update",
                JSON.stringify({ tournamentCode, data: auctionState })
              );
            }
          } else {
            // Update existing auction state
            auctionState = {
              ...auctionState,
              isActive: true,
              isPaused: false,
            };

            // Make sure we have available players
            if (!auctionState.players || auctionState.players.length === 0) {
              console.log("No players in cached state, fetching from database");

              // Fetch available players
              const players = await prisma.player.findMany({
                where: {
                  tournamentId: auctionState.tournamentId,
                  captainId: null,
                },
                include: { agents: true },
              });

              console.log(
                `Found ${players.length} available players for tournament ${auctionState.tournamentId}`
              );

              if (players.length === 0) {
                socket.emit("error", {
                  message: "Cannot start auction - no available players found",
                });
                return;
              }

              auctionState.players = players;
            }

            tournamentCache.set(tournamentCode, auctionState);

            // Sync with Redis in production
            if (!dev) {
              redisClient.publish(
                "tournament-cache-update",
                JSON.stringify({ tournamentCode, data: auctionState })
              );
            }

            // Persist to database
            await prisma.auction.update({
              where: { id: auctionState.auctionId },
              data: {
                isActive: true,
                startedAt: new Date(),
                isPaused: false,
              },
            });
          }

          // Broadcast auction start immediately
          io.to(`tournament:${tournamentCode}`).emit("auction:start", {
            isActive: true,
          });

          // Select first player
          await selectNextPlayer(auctionState.auctionId, tournamentCode, io);

          // Start the auction timer
          startAuctionTimer(auctionState.auctionId, tournamentCode, io);
        } catch (error) {
          console.error("Error starting auction:", error);
          socket.emit("error", { message: "Failed to start auction" });
        }
      });

      // Handle auction pause/resume
      socket.on("auction:pause", async (data) => {
        try {
          const { tournamentCode, isPaused } = data;

          // Get cached auction state
          const auctionState = tournamentCache.get(tournamentCode);
          if (!auctionState) {
            socket.emit("error", { message: "Tournament not found" });
            return;
          }

          // Update local state first
          const updatedAuctionState = {
            ...auctionState,
            isPaused,
          };

          tournamentCache.set(tournamentCode, updatedAuctionState);

          // Handle timer pause/resume
          if (isPaused) {
            // Pause the timer
            if (activeTimers.has(auctionState.auctionId)) {
              clearInterval(activeTimers.get(auctionState.auctionId));
              activeTimers.delete(activeTimers.get(auctionState.auctionId));

              // Store the current timer value
              pausedTimers.set(auctionState.auctionId, {
                timer: auctionState.timer,
                pausedAt: Date.now(),
              });
            }
          } else {
            // Resume the timer
            if (pausedTimers.has(auctionState.auctionId)) {
              const pausedState = pausedTimers.get(auctionState.auctionId);

              // Start the timer with the stored value
              startAuctionTimer(
                auctionState.auctionId,
                tournamentCode,
                io,
                pausedState.timer
              );
              pausedTimers.delete(auctionState.auctionId);
            } else {
              // If no paused state, just restart the timer
              startAuctionTimer(auctionState.auctionId, tournamentCode, io);
            }
          }

          // Sync with Redis in production
          if (!dev) {
            redisClient.publish(
              "tournament-cache-update",
              JSON.stringify({ tournamentCode, data: updatedAuctionState })
            );
          }

          // Broadcast pause state immediately
          io.to(`tournament:${tournamentCode}`).emit("auction:pause", {
            isPaused,
          });

          // Then persist to database asynchronously
          const dbOperation = async () => {
            await prisma.auction.update({
              where: { id: auctionState.auctionId },
              data: { isPaused },
            });
          };

          // Execute the operation immediately
          await dbOperation();
        } catch (error) {
          console.error("Error pausing/resuming auction:", error);
          socket.emit("error", { message: "Failed to pause/resume auction" });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(
          `Client disconnected: ${socket.id} from worker ${process.pid}`
        );
      });
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`> Worker ${process.pid} ready on http://localhost:${PORT}`);
    });
  });
}

// Helper function to select the next player for auction
async function selectNextPlayer(auctionId, tournamentCode, io) {
  try {
    console.log(
      `Selecting next player for auction ${auctionId} in tournament ${tournamentCode}`
    );
    // Get cached auction state
    const auctionState = tournamentCache.get(tournamentCode);

    if (!auctionState) {
      console.error(
        `Auction state not found for tournament ${tournamentCode} in selectNextPlayer`
      );
      // Potentially emit an error or handle gracefully
      return;
    }

    // Store initial credits for all captains at the start of this player's round
    const roundInitialCredits = new Map();
    if (auctionState.captains && Array.isArray(auctionState.captains)) {
      auctionState.captains.forEach((captain) => {
        // Ensure captain.credits is a number, default to 0 if not
        const credits =
          typeof captain.credits === "number" ? captain.credits : 0;
        roundInitialCredits.set(captain.id, credits);
      });
    }
    auctionState.roundInitialCredits = roundInitialCredits; // Persist this in the auctionState

    // Use cached data
    const availablePlayers = auctionState.players || [];
    console.log(`Found ${availablePlayers.length} available players`);

    if (availablePlayers.length === 0) {
      console.log("No available players left. Ending auction.");
      auctionState.isActive = false;
      auctionState.currentPlayer = null;
      auctionState.currentBid = 0;
      auctionState.currentBidder = null;
      // Consider clearing roundInitialCredits or let it be overwritten
      tournamentCache.set(tournamentCode, auctionState);
      io.to(`tournament:${tournamentCode}`).emit("auction:state", auctionState);
      // Clear the auction timer if any
      if (activeTimers.has(auctionId)) {
        clearInterval(activeTimers.get(auctionId));
        activeTimers.delete(auctionId);
      }
      // Persist auction end state
      await prisma.auction.update({
        where: { id: auctionId },
        data: { isActive: false, currentPlayerId: null, currentTimer: 0 },
      });
      return;
    }

    // Select a random player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const nextPlayer = availablePlayers[randomIndex];
    console.log(
      `Selected player: ${nextPlayer.name} (Tier ${
        nextPlayer.tier
      }) starting at ${nextPlayer.startingPrice || 0}`
    );

    // Update local state first
    auctionState.currentPlayer = nextPlayer;
    auctionState.currentBid = nextPlayer.startingPrice || 0; // Initialize with player's starting price
    auctionState.currentBidder = null;
    auctionState.skipVotes = []; // Reset skip votes
    auctionState.timer = auctionState.timerSeconds || 30; // Reset timer from config or default
    auctionState.isPaused = false; // Ensure auction is not paused

    // Remove the selected player from the available list
    auctionState.players = availablePlayers.filter(
      (p) => p.id !== nextPlayer.id
    );

    tournamentCache.set(tournamentCode, auctionState);

    // Persist current player to DB
    await prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentPlayerId: nextPlayer.id,
        currentTimer: auctionState.timer,
        // Reset bids for the new player if your schema stores bids directly on auction
      },
    });
    // If bids are a separate table, ensure old bids are cleared or marked as inactive if needed.

    // Broadcast the new player and reset auction parameters via full state update
    io.to(`tournament:${tournamentCode}`).emit("auction:state", auctionState);

    // Restart the auction timer for the new player
    await startAuctionTimer(auctionId, tournamentCode, io, auctionState.timer);
  } catch (error) {
    console.error(`Error in selectNextPlayer for auction ${auctionId}:`, error);
    if (io && tournamentCode) {
      io.to(`tournament:${tournamentCode}`).emit("error", {
        message: "Error selecting next player.",
      });
    }
  }
}

// Helper function to skip the current player
async function skipCurrentPlayer(auctionId, tournamentCode, io) {
  try {
    // Get cached auction state
    const auctionState = tournamentCache.get(tournamentCode);

    if (auctionState) {
      // Update local state first
      const updatedAuctionState = {
        ...auctionState,
        skipVotes: [],
      };

      tournamentCache.set(tournamentCode, updatedAuctionState);

      // Sync with Redis in production
      if (!dev) {
        redisClient.publish(
          "tournament-cache-update",
          JSON.stringify({ tournamentCode, data: updatedAuctionState })
        );
      }
    }

    // Clear skip votes in database immediately
    await prisma.auctionSkipVote.deleteMany({
      where: { auctionId },
    });

    // Select next player
    await selectNextPlayer(auctionId, tournamentCode, io);
  } catch (error) {
    console.error("Error skipping player:", error);
  }
}

// Helper function to handle auction timer
async function startAuctionTimer(
  auctionId,
  tournamentCode,
  io,
  initialTimer = null
) {
  // Clear any existing timer for this auction
  if (activeTimers.has(auctionId)) {
    clearInterval(activeTimers.get(auctionId));
    activeTimers.delete(auctionId);
  }

  let lastTimerUpdate = Date.now();
  let lastDbUpdate = Date.now();

  const runTimer = async () => {
    try {
      // Get cached auction state
      const auctionState = tournamentCache.get(tournamentCode);

      if (!auctionState) {
        // Fallback to database
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
        });

        if (!auction || !auction.isActive || !auction.currentPlayer) {
          clearInterval(activeTimers.get(auctionId));
          activeTimers.delete(auctionId);
          return;
        }

        // If paused, don't decrement timer
        if (auction.isPaused) {
          return;
        }

        // Decrement timer
        const newTimer = auction.currentTimer - 1;

        // Update timer in database (less frequently)
        const nowDb = Date.now(); // Renamed to avoid conflict with outer 'now'
        if (nowDb - lastDbUpdate > 2000) {
          // Update DB every 2 seconds
          await prisma.auction.update({
            where: { id: auctionId },
            data: { currentTimer: newTimer },
          });
          lastDbUpdate = nowDb;
        }

        // Broadcast timer update
        io.to(`tournament:${tournamentCode}`).emit("auction:timer", {
          timer: newTimer,
        });

        // Check if timer expired
        if (newTimer <= 0) {
          clearInterval(activeTimers.get(auctionId));
          activeTimers.delete(auctionId);

          const dbAuction = await prisma.auction.findUnique({
            where: { id: auctionId },
            include: {
              bids: {
                where: { playerId: auction.currentPlayerId },
                orderBy: { amount: "desc" },
                take: 1,
              },
              currentPlayer: true,
            },
          });
          const highestBidFromDb = dbAuction?.bids[0];

          if (highestBidFromDb) {
            // Player sold (from DB perspective)
            const winningCaptainFromDb = await prisma.captain.findUnique({
              where: { id: highestBidFromDb.captainId },
            });
            const soldPlayerFromDb = dbAuction.currentPlayer;

            // Perform DB updates for sold player
            await prisma.$transaction(async (tx) => {
              // 1. Update winning captain's credits (actual permanent deduction)
              const winnerStartCredits = roundInitialCreditsMap.get(
                winningCaptainFromDb.id
              );
              if (winnerStartCredits === undefined)
                throw new Error(
                  `Initial credits not found for winner ${winningCaptainFromDb.id}`
                );

              await tx.captain.update({
                where: { id: winningCaptainFromDb.id },
                data: { credits: winnerStartCredits - highestBidFromDb.amount },
              });

              // 2. Assign player to captain and set sold price
              await tx.player.update({
                where: { id: soldPlayerFromDb.id },
                data: {
                  captain: {
                    connect: { id: winningCaptainFromDb.id },
                  },
                  // soldPrice: highestBidFromDb.amount,
                },
              });

              // 3. Add to auction history
              await tx.auctionHistory.create({
                data: {
                  auctionId: auctionId,
                  playerId: soldPlayerFromDb.id,
                  captainId: winningCaptainFromDb.id,
                  finalBid: highestBidFromDb.amount,
                  timestamp: new Date(),
                },
              });
              // Fetch updated auction state to reflect these DB changes before broadcasting
              // This part needs to be carefully managed with tournamentCache to ensure consistency
              // For now, we assume selectNextPlayer will refresh necessary parts from cache/DB
            });
          } else {
            // No bids for this player
            console.log(
              `Timer expired for player ${auction.currentPlayer?.name} (from DB fallback), no bids.`
            );
          }

          // Wait a moment before selecting the next player
          setTimeout(() => {
            selectNextPlayer(auctionId, tournamentCode, io);
            // Timer for next player is started by selectNextPlayer
          }, 1000);
          return; // Exit runTimer
        }

        return;
      }

      // Using cached state
      if (!auctionState.isActive || !auctionState.currentPlayer) {
        clearInterval(activeTimers.get(auctionId));
        activeTimers.delete(auctionId);
        return;
      }

      // If paused, don't decrement timer
      if (auctionState.isPaused) {
        // Store the current timer value if not already stored
        if (!pausedTimers.has(auctionId)) {
          pausedTimers.set(auctionId, {
            timer: auctionState.timer,
            pausedAt: Date.now(),
          });
        }
        return; // Exit runTimer iteration if paused
      }

      // Use initial timer if provided (for resuming from pause)
      let currentTimer =
        initialTimer !== null ? initialTimer : auctionState.timer;

      // If we're resuming from a pause, use that value for the first iteration only
      if (initialTimer !== null) {
        initialTimer = null;
      } else {
        // Calculate time elapsed since last update
        const now = Date.now();
        const elapsed = Math.floor((now - lastTimerUpdate) / 1000);
        lastTimerUpdate = now;

        // Ensure we decrement by at least 1 second
        const decrementBy = Math.max(1, elapsed);

        // Decrement timer
        currentTimer = Math.max(0, currentTimer - decrementBy);
      }

      // Update local state
      const updatedAuctionState = {
        ...auctionState,
        timer: currentTimer,
      };

      tournamentCache.set(tournamentCode, updatedAuctionState);

      // Sync with Redis in production, but less frequently
      if (!dev && lastDbUpdate > 2000) {
        redisClient.publish(
          "tournament-cache-update",
          JSON.stringify({ tournamentCode, data: updatedAuctionState })
        );
      }

      // Update timer in database less frequently
      const now = Date.now();
      if (now - lastDbUpdate > 2000) {
        // Update DB every 2 seconds
        await prisma.auction.update({
          where: { id: auctionId },
          data: { currentTimer: currentTimer },
        });

        lastDbUpdate = now;
      }

      // Broadcast timer update
      io.to(`tournament:${tournamentCode}`).emit("auction:timer", {
        timer: currentTimer,
      });

      // Check if timer expired
      if (currentTimer <= 0) {
        clearInterval(activeTimers.get(auctionId));
        activeTimers.delete(auctionId);

        const roundInitialCreditsMap = auctionState.roundInitialCredits;

        // If there's a bid, complete the auction for this player
        if (auctionState.currentBidder && auctionState.currentPlayer) {
          const winningCaptainProfile = auctionState.captains.find(
            (c) => c.id === auctionState.currentBidder.id
          );
          const soldPlayer = auctionState.currentPlayer;
          const finalBidAmount = auctionState.currentBid;

          if (winningCaptainProfile && soldPlayer && roundInitialCreditsMap) {
            // Persist to Database
            try {
              await prisma.$transaction(async (tx) => {
                // 1. Update winning captain's credits (actual permanent deduction)
                const winnerStartCredits = roundInitialCreditsMap.get(
                  winningCaptainProfile.id
                );
                if (winnerStartCredits === undefined)
                  throw new Error(
                    `Initial credits not found for winner ${winningCaptainProfile.id}`
                  );

                await tx.captain.update({
                  where: { id: winningCaptainProfile.id },
                  data: { credits: winnerStartCredits - finalBidAmount },
                });

                // 2. Assign player to captain and set sold price
                await tx.player.update({
                  where: { id: soldPlayer.id },
                  data: {
                    captain: {
                      connect: { id: winningCaptainProfile.id },
                    },
                    // soldPrice: finalBidAmount,
                  },
                });

                // 3. Add to auction history
                await tx.auctionHistory.create({
                  data: {
                    auctionId: auctionState.auctionId,
                    playerId: soldPlayer.id,
                    captainId: winningCaptainProfile.id,
                    finalBid: finalBidAmount,
                    timestamp: new Date(),
                  },
                });

                // 4. Update captain's picked tiers (if not already handled by client/state)
                // This might be complex if pickedTiers is a separate relation.
                // For simplicity, we assume auctionState update handles this for client.
              });
            } catch (dbError) {
              console.error("DB transaction error on player sale:", dbError);
              io.to(`tournament:${tournamentCode}`).emit("error", {
                message: "Failed to save auction result. Contact admin.",
              });
              // Potentially try to re-select player or pause auction
            }

            // Update auctionState for broadcast and cache
            const updatedCaptainsArray = auctionState.captains.map((capt) => {
              const captainStartOfRoundCredits = roundInitialCreditsMap.get(
                capt.id
              );
              // Fallback to current credits if map somehow misses an entry (should not happen)
              const actualStartCredits =
                captainStartOfRoundCredits !== undefined
                  ? captainStartOfRoundCredits
                  : capt.credits;

              if (capt.id === winningCaptainProfile.id) {
                return {
                  ...capt,
                  credits: actualStartCredits - finalBidAmount, // Reflects permanent deduction
                  players: [...(capt.players || []), soldPlayer],
                  pickedTiers: [
                    ...(capt.pickedTiers || []),
                    { tier: soldPlayer.tier },
                  ], // Assuming structure
                };
              } else {
                // For losing/non-bidding captains, their credits for the next round's start
                // will be their credits at the start of THIS player's round.
                return {
                  ...capt,
                  credits: actualStartCredits,
                };
              }
            });

            const newHistoryEntry = {
              playerId: soldPlayer.id,
              playerName: soldPlayer.name,
              captainId: winningCaptainProfile.id,
              captainName: winningCaptainProfile.user.name,
              finalBid: finalBidAmount,
              timestamp: new Date().toISOString(),
            };

            const stateAfterPlayerSold = {
              ...auctionState,
              captains: updatedCaptainsArray,
              history: [newHistoryEntry, ...(auctionState.history || [])],
              // currentPlayer, currentBid, currentBidder, etc., will be reset by selectNextPlayer
            };
            tournamentCache.set(tournamentCode, stateAfterPlayerSold);
            io.to(`tournament:${tournamentCode}`).emit(
              "auction:state",
              stateAfterPlayerSold
            );
          } else {
            console.error(
              "Error processing sold player: winning captain, sold player, or roundInitialCreditsMap missing in cached state."
            );
          }
        } else {
          // No bidder when timer expired for the current player in cache
          console.log(
            `Timer expired for player ${auctionState.currentPlayer?.name} (from cache), no bids. Selecting next player.`
          );
          // Optionally add to history as "unsold"
        }

        // Wait a moment before selecting the next player
        setTimeout(() => {
          selectNextPlayer(auctionId, tournamentCode, io);
          // Timer for the next player is started within selectNextPlayer
        }, 1000);
        return; // IMPORTANT: Exit runTimer as current player's turn is over
      }
    } catch (error) {
      console.error("Error in auction timer:", error);
      clearInterval(activeTimers.get(auctionId));
      activeTimers.delete(auctionId);
    }
  };

  // Run the timer every second
  const intervalId = setInterval(runTimer, 1000);
  activeTimers.set(auctionId, intervalId);

  // Run immediately
  runTimer();
}

// Graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function shutdown() {
  console.log("Shutting down server...");

  // Clear all active timers
  for (const [auctionId, intervalId] of activeTimers.entries()) {
    clearInterval(intervalId);
  }

  // Disconnect Prisma and Redis
  await Promise.all([
    prisma.$disconnect(),
    redisClient.quit(),
    redisPub.quit(),
    redisSub.quit(),
  ]);

  console.log("Server shutdown complete");
  process.exit(0);
}

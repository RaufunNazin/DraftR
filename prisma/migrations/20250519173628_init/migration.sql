-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HOST', 'CAPTAIN', 'AUDIENCE');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('DUELIST', 'INITIATOR', 'CONTROLLER', 'SENTINEL');

-- CreateEnum
CREATE TYPE "BidMode" AS ENUM ('OPEN', 'HIDDEN', 'BLIND', 'TIMED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AUDIENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "hostId" TEXT NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "captainId" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAgent" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "PlayerAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Captain" (
    "id" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "Captain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptainPickedTier" (
    "id" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "captainId" TEXT NOT NULL,

    CONSTRAINT "CaptainPickedTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptainAgent" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,

    CONSTRAINT "CaptainAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "bidMode" "BidMode" NOT NULL DEFAULT 'OPEN',
    "timerSeconds" INTEGER NOT NULL DEFAULT 30,
    "currentTimer" INTEGER NOT NULL DEFAULT 30,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "tournamentId" TEXT NOT NULL,
    "currentPlayerId" TEXT,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auctionId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionSkipVote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auctionId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,

    CONSTRAINT "AuctionSkipVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionHistory" (
    "id" TEXT NOT NULL,
    "finalBid" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auctionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,

    CONSTRAINT "AuctionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TournamentParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_code_key" ON "Tournament"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAgent_playerId_agent_key" ON "PlayerAgent"("playerId", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "Captain_userId_key" ON "Captain"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaptainPickedTier_captainId_tier_key" ON "CaptainPickedTier"("captainId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "CaptainAgent_captainId_agent_key" ON "CaptainAgent"("captainId", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_tournamentId_key" ON "Auction"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_currentPlayerId_key" ON "Auction"("currentPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionSkipVote_auctionId_captainId_key" ON "AuctionSkipVote"("auctionId", "captainId");

-- CreateIndex
CREATE UNIQUE INDEX "_TournamentParticipants_AB_unique" ON "_TournamentParticipants"("A", "B");

-- CreateIndex
CREATE INDEX "_TournamentParticipants_B_index" ON "_TournamentParticipants"("B");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAgent" ADD CONSTRAINT "PlayerAgent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Captain" ADD CONSTRAINT "Captain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Captain" ADD CONSTRAINT "Captain_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptainPickedTier" ADD CONSTRAINT "CaptainPickedTier_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptainAgent" ADD CONSTRAINT "CaptainAgent_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_currentPlayerId_fkey" FOREIGN KEY ("currentPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionSkipVote" ADD CONSTRAINT "AuctionSkipVote_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionSkipVote" ADD CONSTRAINT "AuctionSkipVote_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionHistory" ADD CONSTRAINT "AuctionHistory_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionHistory" ADD CONSTRAINT "AuctionHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionHistory" ADD CONSTRAINT "AuctionHistory_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TournamentParticipants" ADD CONSTRAINT "_TournamentParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TournamentParticipants" ADD CONSTRAINT "_TournamentParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

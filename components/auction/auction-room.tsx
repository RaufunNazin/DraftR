"use client";

import { useEffect, useState } from "react";
import { useAuctionState, useSocketStore } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import {
  DollarSign,
  Layers,
  Menu,
  SkipForward,
  Trophy,
  Users,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  formatCredits,
  canCaptainBid,
  getTierBadgeClass,
  getRoleBadgeClass,
} from "@/lib/utils";
import { BID_INCREMENTS } from "@/lib/constants";
import { CurrentPlayerCard } from "./current-player-card";
import type { TournamentStatus, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";

interface AuctionRoomProps {
  userRole: UserRole;
  selectedCaptainId: string | null;
  setSelectedCaptainId: (id: string | null) => void;
  toggleSidebar: () => void;
  status: TournamentStatus;
  tournamentName: String
}

export function AuctionRoom({
  userRole,
  selectedCaptainId,
  setSelectedCaptainId,
  toggleSidebar,
  status,
  tournamentName,
}: AuctionRoomProps) {
  const router = useRouter()
  const { placeBid, voteToSkip } = useSocketStore();
  const auctionState = useAuctionState();
  const { data: session } = useSession();
  const [timePercent, setTimePercent] = useState(100);

  // Update timer percentage
  useEffect(() => {
    if (auctionState?.timer !== undefined && auctionState.timer >= 0) {
      setTimePercent((auctionState.timer / 30) * 100);
    }
  }, [auctionState?.timer]);

  // Auto-select first captain for demo purposes if user is a captain
  useEffect(() => {
    if (
      userRole === "CAPTAIN" &&
      auctionState?.captains.length &&
      !selectedCaptainId
    ) {
      setSelectedCaptainId(auctionState.captains[0].id);
    }
  }, [
    auctionState?.captains,
    selectedCaptainId,
    setSelectedCaptainId,
    userRole,
  ]);

  const handleBid = (increment: number) => {
    if (!selectedCaptainId || !auctionState?.currentPlayer) return;

    const newBid = auctionState.currentBid + increment;
    placeBid(selectedCaptainId, newBid);
  };

  const handleSkip = () => {
    if (!selectedCaptainId) return;
    voteToSkip(selectedCaptainId);
  };

  const selectedCaptain = auctionState?.captains.find(
    (c) => c.id === selectedCaptainId
  );

  const canBid =
    selectedCaptain &&
    auctionState?.currentPlayer &&
    canCaptainBid(
      selectedCaptain.tier,
      selectedCaptain.credits,
      auctionState.currentPlayer.tier,
      auctionState.currentBid,
      selectedCaptain.pickedTiers.map((pt) => pt.tier)
    );

  const hasVotedToSkip =
    auctionState?.skipVotes.includes(selectedCaptainId || "") || false;

  // Calculate skip vote threshold
  const skipVotesNeeded = auctionState?.captains.length
    ? Math.ceil(auctionState.captains.length / 2)
    : 0;

  if (!auctionState) return null;

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {status !== "COMPLETED" && (
            <Button variant="outline" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {tournamentName} - Auction Room
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {session?.user?.role === "ADMIN" && (
            <Badge
              variant="outline"
              className="px-3 py-1 text-sm flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Captains: {auctionState.captains.length}</span>
            </Badge>
          )}
          {status !== "COMPLETED" && (
            <Badge
              variant="outline"
              className="px-3 py-1 text-sm flex items-center gap-2"
            >
              <Layers className="h-4 w-4" />
              <span>
                Mode:{" "}
                {auctionState.bidMode.charAt(0).toUpperCase() +
                  auctionState.bidMode.slice(1)}
              </span>
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Auction Area */}
        <div className="lg:col-span-3">
          {status === "COMPLETED" ? (
            <>
              <div className="flex items-center justify-center mb-6 p-4 bg-gradient-to-r from-green-500/10 to-purple-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
                <h2 className="text-xl font-bold">
                  Auction Complete - Final Team Compositions
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctionState.captains.map((captain) => (
                  <Card
                    key={captain.id}
                    className="border-purple-500/20 shadow-lg hover:shadow-purple-500/5 transition-all duration-200"
                  >
                    <CardHeader
                      className={`bg-gradient-to-r from-purple-500/10 to-transparent border-b border-purple-500/10`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className={getCaptainAvatarClass(captain.tier)}>
                          <AvatarFallback>
                            {captain.user.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {captain.user.name}'s Team
                          </CardTitle>
                          <div className="text-xs text-muted-foreground">
                            Tier {captain.tier} Captain •{" "}
                            {formatCredits(captain.credits)} credits remaining
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Captain as a player */}
                      <div className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`${getTierBadgeClass(
                              captain.tier
                            )} px-2 text-xs rounded-full`}
                          >
                            T{captain.tier}
                          </div>
                          <h4 className="font-medium">{captain.user.name}</h4>
                          <Badge
                            className={getRoleBadgeClass(captain.role)}
                            variant="outline"
                          >
                            {captain.role}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1">
                          {captain.agents.map((agentObj) => (
                            <Badge
                              key={agentObj.id}
                              variant="outline"
                              className="px-1.5 py-0 text-xs"
                            >
                              {agentObj.agent}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Drafted players */}
                      {captain.players
                        .sort((a, b) => a.tier - b.tier)
                        .map((player) => (
                          <div
                            key={player.id}
                            className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`${getTierBadgeClass(
                                  player.tier
                                )} px-2 text-xs rounded-full`}
                              >
                                T{player.tier}
                              </div>
                              <h4 className="font-medium">{player.name}</h4>
                              <Badge
                                className={getRoleBadgeClass(player.role)}
                                variant="outline"
                              >
                                {player.role}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1">
                              {player.agents.map((agentObj) => (
                                <Badge
                                  key={agentObj.id}
                                  variant="outline"
                                  className="px-1.5 py-0 text-xs"
                                >
                                  {agentObj.agent}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : auctionState.currentPlayer ? (
            <CurrentPlayerCard
              player={auctionState.currentPlayer}
              currentBid={auctionState.currentBid}
              currentBidder={auctionState.currentBidder}
              timer={auctionState.timer}
              timePercent={timePercent}
              isPaused={auctionState.isPaused}
            />
          ) : (
            <Card className="border-red-500/20 shadow-lg h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
                {status === "UPCOMING" && (
                  <p className="text-muted-foreground">
                    {session?.user?.role === "ADMIN"
                      ? "Click 'Start Auction' to begin"
                      : "Please wait while the officials set up the auction."}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Captain Bidding Controls - Only visible for captains */}
          {userRole === "CAPTAIN" && status === "ACTIVE" && (
            <Card className="border-purple-500/20 shadow-lg mt-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Bidding Controls</h3>

                {selectedCaptain && (
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className={getCaptainAvatarClass(selectedCaptain.tier)}
                      >
                        <AvatarFallback>
                          {selectedCaptain.user.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {selectedCaptain.user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tier {selectedCaptain.tier} Captain •{" "}
                          {formatCredits(selectedCaptain.credits)} credits
                          remaining
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bidding Controls */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Bidding</h4>
                    <div className="flex gap-2">
                      {BID_INCREMENTS.map((increment) => (
                        <Button
                          key={increment}
                          variant="outline"
                          className="flex-1 bid-button p-8 text-lg"
                          disabled={
                            !canBid ||
                            !auctionState.isActive ||
                            !auctionState.currentPlayer ||
                            auctionState.isPaused
                          }
                          onClick={() => handleBid(increment)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />+{increment}
                        </Button>
                      ))}
                    </div>

                    {selectedCaptain &&
                      auctionState.currentPlayer &&
                      !canBid && (
                        <div className="text-xs text-destructive">
                          {selectedCaptain.tier ===
                          auctionState.currentPlayer.tier
                            ? "You cannot bid on your own tier"
                            : auctionState.currentPlayer &&
                              selectedCaptain.pickedTiers.some(
                                (pt) =>
                                  pt.tier === auctionState.currentPlayer!.tier
                              )
                            ? "You already have a player from this tier"
                            : selectedCaptain.credits < auctionState.currentBid
                            ? "Not enough credits"
                            : "Cannot bid"}
                        </div>
                      )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Skip Vote ({auctionState.skipVotes.length}/
                      {skipVotesNeeded} needed)
                    </h4>
                    <Button
                      variant="outline"
                      className="w-full border border-red-500/50"
                      disabled={
                        !auctionState.isActive ||
                        !auctionState.currentPlayer ||
                        hasVotedToSkip ||
                        auctionState.isPaused
                      }
                      onClick={handleSkip}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      {hasVotedToSkip ? "Voted to Skip" : "Vote to Skip Player"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function for captain avatar class
function getCaptainAvatarClass(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-red-500 text-white";
    case 2:
      return "bg-orange-500 text-white";
    case 3:
      return "bg-yellow-500 text-white";
    case 4:
      return "bg-green-500 text-white";
    case 5:
      return "bg-blue-500 text-white";
    default:
      return "bg-purple-500 text-white";
  }
}

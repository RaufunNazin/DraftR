"use client"

import { useEffect, useState } from "react"
import { useSocketStore } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DollarSign, Gavel, Layers, Menu, SkipForward, Trophy, Users } from "lucide-react"
import { formatCredits, canCaptainBid } from "@/lib/utils"
import { BID_INCREMENTS } from "@/lib/constants"
import { CurrentPlayerCard } from "./current-player-card"
import type { UserRole } from "@/lib/types"

interface AuctionRoomProps {
  userRole: UserRole
  selectedCaptainId: string | null
  setSelectedCaptainId: (id: string | null) => void
  toggleSidebar: () => void
}

export function AuctionRoom({ userRole, selectedCaptainId, setSelectedCaptainId, toggleSidebar }: AuctionRoomProps) {
  const { auctionState, startAuction, placeBid, voteToSkip } = useSocketStore()

  const [timePercent, setTimePercent] = useState(100)

  // Update timer percentage
  useEffect(() => {
    if (auctionState?.timer !== undefined && auctionState.timer >= 0) {
      setTimePercent((auctionState.timer / 30) * 100)
    }
  }, [auctionState?.timer])

  // Auto-select first captain for demo purposes if user is a captain
  useEffect(() => {
    if (userRole === "CAPTAIN" && auctionState?.captains.length && !selectedCaptainId) {
      setSelectedCaptainId(auctionState.captains[0].id)
    }
  }, [auctionState?.captains, selectedCaptainId, setSelectedCaptainId, userRole])

  const handleStartAuction = () => {
    startAuction()
  }

  const handleBid = (increment: number) => {
    if (!selectedCaptainId || !auctionState?.currentPlayer) return

    const newBid = auctionState.currentBid + increment
    placeBid(selectedCaptainId, newBid)
  }

  const handleSkip = () => {
    if (!selectedCaptainId) return
    voteToSkip(selectedCaptainId)
  }

  const selectedCaptain = auctionState?.captains.find((c) => c.id === selectedCaptainId)

  const canBid =
    selectedCaptain &&
    auctionState?.currentPlayer &&
    canCaptainBid(
      selectedCaptain.tier,
      selectedCaptain.credits,
      auctionState.currentPlayer.tier,
      auctionState.currentBid,
      selectedCaptain.pickedTiers.map((pt) => pt.tier),
    )

  const hasVotedToSkip = auctionState?.skipVotes.includes(selectedCaptainId || "") || false

  if (!auctionState) return null

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Valorant Auction</h1>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Captains: {auctionState.captains.length}</span>
          </Badge>

          <Badge variant="outline" className="px-3 py-1 text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Mode: {auctionState.bidMode.charAt(0).toUpperCase() + auctionState.bidMode.slice(1)}</span>
          </Badge>

          {(userRole === "ADMIN" || userRole === "HOST") && !auctionState.isActive && (
            <Button
              onClick={handleStartAuction}
              className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700"
            >
              <Gavel className="mr-2 h-4 w-4" />
              Start Auction
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Auction Area */}
        <div className="lg:col-span-3">
          {/* Current Player Card */}
          {auctionState.currentPlayer ? (
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
                <h2 className="text-2xl font-bold mb-2">
                  {auctionState.isActive ? "Auction Complete" : "Waiting to Start"}
                </h2>
                <p className="text-muted-foreground">
                  {auctionState.isActive ? "All players have been drafted!" : "Click 'Start Auction' to begin"}
                </p>
              </div>
            </Card>
          )}

          {/* Captain Bidding Controls - Only visible for captains */}
          {userRole === "CAPTAIN" && (
            <Card className="border-purple-500/20 shadow-lg mt-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Bidding Controls</h3>

                {selectedCaptain && (
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`captain-avatar captain-tier-${selectedCaptain.tier}`}>
                        <AvatarFallback>{selectedCaptain.user.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{selectedCaptain.user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Tier {selectedCaptain.tier} Captain • {formatCredits(selectedCaptain.credits)} credits
                          remaining
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bidding Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Bidding</h4>
                    <div className="flex gap-2">
                      {BID_INCREMENTS.map((increment) => (
                        <Button
                          key={increment}
                          variant="outline"
                          className="flex-1 bid-button"
                          disabled={
                            !canBid || !auctionState.isActive || !auctionState.currentPlayer || auctionState.isPaused
                          }
                          onClick={() => handleBid(increment)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />+{increment}
                        </Button>
                      ))}
                    </div>

                    {selectedCaptain && auctionState.currentPlayer && !canBid && (
                      <div className="text-xs text-destructive">
                        {selectedCaptain.tier === auctionState.currentPlayer.tier
                          ? "You cannot bid on your own tier"
                          : selectedCaptain.pickedTiers.some((pt) => pt.tier === auctionState.currentPlayer.tier)
                            ? "You already have a player from this tier"
                            : selectedCaptain.credits < auctionState.currentBid
                              ? "Not enough credits"
                              : "Cannot bid"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Skip Vote ({auctionState.skipVotes.length}/{Math.ceil(auctionState.captains.length / 2)} needed)
                    </h4>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={
                        !auctionState.isActive || !auctionState.currentPlayer || hasVotedToSkip || auctionState.isPaused
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
  )
}

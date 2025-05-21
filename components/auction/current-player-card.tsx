"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Pause, User } from "lucide-react";
import type { Player, Captain } from "@/lib/types";
import {
  formatCredits,
  formatTimer,
  getRoleBadgeClass,
  getTierBadgeClass,
} from "@/lib/utils";

interface CurrentPlayerCardProps {
  player: Player;
  currentBid: number;
  currentBidder: Captain | null;
  timer: number;
  timePercent: number;
  isPaused: boolean;
}

export function CurrentPlayerCard({
  player,
  currentBid,
  currentBidder,
  timer,
  timePercent,
  isPaused,
}: CurrentPlayerCardProps) {
  return (
    <Card className="border-red-500/20 shadow-lg auction-card overflow-hidden">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Player Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`${getTierBadgeClass(player.tier)} px-3 rounded-md`}
              >
                T{player.tier}
              </div>
              <h2 className="text-2xl font-bold">{player.name}</h2>
              <Badge className={getRoleBadgeClass(player.role)}>
                {player.role}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Starting Price
                </div>
                <div className="text-xl font-bold">
                  {formatCredits(player.startingPrice)} credits
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Current Bid
                </div>
                <div className="text-xl font-bold">
                  {formatCredits(currentBid)} credits
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2">
                Top Agents
              </div>
              <div className="flex flex-wrap gap-2">
                {player.agents ? (
                  player.agents.map((agent, i) => (
                    <Badge key={i} variant="outline" className="px-3 py-1">
                      {typeof agent === "string" ? agent : agent.agent}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Loading agents...
                  </div>
                )}
              </div>
            </div>

            {/* Current Bidder */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                Current Highest Bidder
              </div>
              {currentBidder ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    className={`captain-avatar captain-tier-${currentBidder.tier}`}
                  >
                    <AvatarFallback>
                      {currentBidder.user.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{currentBidder.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      T{currentBidder.tier} Captain •{" "}
                      {formatCredits(currentBidder.credits)} credits left
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="h-10 w-10 border-2 rounded-full p-2" />
                  <div>No bids yet</div>
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-muted flex items-center justify-center mb-4 relative">
              <div className="auction-timer">
                {isPaused ? (
                  <div className="flex items-center justify-center">
                    <Pause className="h-8 w-8 text-yellow-500" />
                  </div>
                ) : (
                  formatTimer(timer)
                )}
              </div>
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  className="text-muted stroke-current"
                  strokeWidth="4"
                  fill="transparent"
                  r="48"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`${
                    isPaused ? "text-yellow-500" : "text-primary"
                  } stroke-current transition-all duration-500 ease-in-out`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="transparent"
                  r="48"
                  cx="50"
                  cy="50"
                  strokeDasharray="301.59"
                  strokeDashoffset={301.59 - (301.59 * timePercent) / 100}
                />
              </svg>
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4" />
                <span>{isPaused ? "Timer Paused" : "Time Remaining"}</span>
              </div>
              <Progress
                value={timePercent}
                className={`w-full h-2 ${isPaused ? "bg-yellow-500/20" : ""}`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

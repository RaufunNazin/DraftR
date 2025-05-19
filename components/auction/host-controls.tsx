"use client"
import { useSocketStore } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Eye, EyeOff, Pause, Play, Shield, Timer } from "lucide-react"
import type { BidMode } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function HostControls() {
  const { auctionState, changeBidMode, togglePause } = useSocketStore()
  const { toast } = useToast()

  const handleChangeBidMode = (mode: BidMode) => {
    changeBidMode(mode)

    toast({
      title: "Bid Mode Changed",
      description: `Bid mode set to ${mode}`,
    })
  }

  const handleTogglePause = () => {
    if (!auctionState) return

    togglePause(!auctionState.isPaused)

    toast({
      title: auctionState.isPaused ? "Auction Resumed" : "Auction Paused",
      description: auctionState.isPaused ? "The auction has been resumed" : "The auction has been paused",
    })
  }

  if (!auctionState) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Host Controls</span>
        </div>

        <div className="flex items-center gap-4">
          <Select value={auctionState.bidMode} onValueChange={(value) => handleChangeBidMode(value as BidMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select bid mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Open Bidding</span>
                </div>
              </SelectItem>
              <SelectItem value="HIDDEN">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  <span>Hidden Bidding</span>
                </div>
              </SelectItem>
              <SelectItem value="BLIND">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Blind Bidding</span>
                </div>
              </SelectItem>
              <SelectItem value="TIMED">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  <span>Timed Bidding</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleTogglePause} disabled={!auctionState.isActive}>
            {auctionState.isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Auction
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Auction
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

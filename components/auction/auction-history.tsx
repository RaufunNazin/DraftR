"use client"

import { useAuctionStore } from "@/lib/socket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { formatCredits } from "@/lib/utils"
import { History } from "lucide-react"

export function AuctionHistory() {
  const { auctionHistory } = useAuctionStore()

  return (
    <Card className="border-blue-500/20 shadow-lg h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Auction History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {auctionHistory.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">No auction history yet</div>
          ) : (
            <div className="space-y-1 p-4">
              {auctionHistory.map((item, index) => (
                <div
                  key={`${item.playerId}-${item.timestamp}`}
                  className="p-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{item.playerName}</div>
                    <Badge variant="outline" className="bg-primary/10">
                      {formatCredits(item.finalBid)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">Drafted by {item.captainName}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

"use client"
import { useState, useEffect } from "react"
import { useSocketStore } from "@/lib/socket"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCredits, getRoleBadgeClass, getTierBadgeClass } from "@/lib/utils"
import { History } from "lucide-react"

interface SidebarDrawerProps {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  sidebarTab: "roster" | "history"
  setSidebarTab: (tab: "roster" | "history") => void
}

export function SidebarDrawer({ isSidebarOpen, toggleSidebar, sidebarTab, setSidebarTab }: SidebarDrawerProps) {
  const { auctionState } = useSocketStore()
  const [selectedCaptainId, setSelectedCaptainId] = useState("")

  // Set initial captain when auction state loads
  useEffect(() => {
    if (auctionState?.captains.length && !selectedCaptainId) {
      setSelectedCaptainId(auctionState.captains[0].id)
    }
  }, [auctionState?.captains, selectedCaptainId])

  const selectedCaptain = auctionState?.captains.find((c) => c.id === selectedCaptainId)

  if (!auctionState) return null

  return (
    <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
      <SheetContent side="left" className="w-[350px] sm:w-[450px] p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Tournament Information</SheetTitle>
        </SheetHeader>

        <Tabs
          value={sidebarTab}
          onValueChange={(value) => setSidebarTab(value as "roster" | "history")}
          className="w-full"
        >
          <TabsList className="w-full justify-start px-6">
            <TabsTrigger value="roster">Team Rosters</TabsTrigger>
            <TabsTrigger value="history">Auction History</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="p-6 pt-4">
            <div className="mb-4">
              <Select value={selectedCaptainId} onValueChange={setSelectedCaptainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select captain" />
                </SelectTrigger>
                <SelectContent>
                  {auctionState.captains.map((captain) => (
                    <SelectItem key={captain.id} value={captain.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className={`captain-avatar captain-tier-${captain.tier} h-6 w-6`}>
                          <AvatarFallback>{captain.user.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{captain.user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCaptain && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedCaptain.user.name}'s Team</h3>
                    <p className="text-sm text-muted-foreground">
                      Tier {selectedCaptain.tier} Captain • {formatCredits(selectedCaptain.credits)} credits remaining
                    </p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedCaptain.players.length}/5 Players
                  </Badge>
                </div>

                <Separator className="mb-4" />

                <ScrollArea className="h-[calc(100vh-250px)]">
                  {/* Captain as a player */}
                  <div className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={getTierBadgeClass(selectedCaptain.tier)}>{selectedCaptain.tier}</div>
                      <h4 className="font-medium">{selectedCaptain.user.name} (Captain)</h4>
                      <Badge className={getRoleBadgeClass(selectedCaptain.role)}>{selectedCaptain.role}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCaptain.agents.map((agentObj) => (
                        <Badge key={agentObj.id} variant="outline" className="px-2 py-0.5 text-xs">
                          {agentObj.agent}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Drafted players */}
                  {selectedCaptain.players.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No players drafted yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedCaptain.players.map((player) => (
                        <div
                          key={player.id}
                          className="p-4 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={getTierBadgeClass(player.tier)}>{player.tier}</div>
                            <h4 className="font-medium">{player.name}</h4>
                            <Badge className={getRoleBadgeClass(player.role)}>{player.role}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {player.agents.map((agentObj) => (
                              <Badge key={agentObj.id} variant="outline" className="px-2 py-0.5 text-xs">
                                {agentObj.agent}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-0">
            <ScrollArea className="h-[calc(100vh-150px)]">
              {auctionState.history.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No auction history yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-4">
                  {auctionState.history.map((item, index) => (
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

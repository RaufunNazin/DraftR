"use client"
import { useAuctionStore } from "@/lib/socket"
import { useAppStore } from "@/lib/store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCredits, getCaptainAvatarClass, getRoleBadgeClass, getTierBadgeClass } from "@/lib/utils"

export function TeamDrawer() {
  const { captains } = useAuctionStore()
  const { isSidebarOpen, toggleSidebar } = useAppStore()

  return (
    <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
      <SheetContent side="left" className="w-[350px] sm:w-[450px] p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Team Rosters</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue={captains[0]?.id} className="w-full">
          <TabsList className="w-full justify-start px-6 overflow-auto">
            {captains.map((captain) => (
              <TabsTrigger key={captain.id} value={captain.id} className="flex items-center gap-2">
                <Avatar className={getCaptainAvatarClass(captain.tier)}>
                  <AvatarImage src={captain.avatar || "/placeholder.svg"} alt={captain.name} />
                  <AvatarFallback>{captain.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <span>{captain.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {captains.map((captain) => (
            <TabsContent key={captain.id} value={captain.id} className="p-6 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{captain.name}'s Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Tier {captain.tier} Captain • {formatCredits(captain.credits)} credits remaining
                  </p>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {captain.pickedPlayers.length}/5 Players
                </Badge>
              </div>

              <Separator className="mb-4" />

              <ScrollArea className="h-[calc(100vh-200px)]">
                {captain.pickedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No players drafted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {captain.pickedPlayers.map((player) => (
                      <div key={player.id} className="p-4 rounded-lg border bg-card hover:bg-card/80 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={getTierBadgeClass(player.tier)}>{player.tier}</div>
                          <h4 className="font-medium">{player.name}</h4>
                          <Badge className={getRoleBadgeClass(player.role)}>{player.role}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {player.agents.map((agent) => (
                            <Badge key={agent} variant="outline" className="px-2 py-0.5 text-xs">
                              {agent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

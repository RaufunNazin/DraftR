"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { AGENTS, ROLES } from "@/lib/constants"
import { addPlayer, removePlayer, getPlayers } from "@/lib/actions/player"
import type { Agent, Player, PlayerRole, Tier } from "@/lib/types"
import { toast } from 'react-toastify'

interface PlayerRegistrationProps {
  tournamentId: string
}

export function PlayerRegistration({ tournamentId }: PlayerRegistrationProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [name, setName] = useState("")
  const [tier, setTier] = useState<Tier | null>(null)
  const [role, setRole] = useState<PlayerRole | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [tournamentId])

  const loadPlayers = async () => {
    setIsLoading(true)
    try {
      const result = await getPlayers(tournamentId)
      if (result.success) {
        setPlayers(
          (result.players ?? []).map((player) => ({
            ...player,
            tier: player.tier as unknown as Tier,
            captain: undefined,
          }))
        )
      } else {
        toast.error(result.error || "Failed to load players")
      }
    } catch (error) {
      toast.error("Failed to load players")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAgent = (agent: Agent) => {
    if (selectedAgents.length < 3 && !selectedAgents.includes(agent)) {
      setSelectedAgents([...selectedAgents, agent])
    }
  }

  const handleRemoveAgent = (agent: Agent) => {
    setSelectedAgents(selectedAgents.filter((a) => a !== agent))
  }

  const handleAddPlayer = async () => {
    if (!name || !tier || !role || selectedAgents.length === 0) {
      toast.error("Please fill in all fields and select at least one agent.")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await addPlayer(tournamentId, name, tier, role, selectedAgents)

      if (result.success) {
        toast.success("Player has been added to the tournament.")

        // Reset form
        setName("")
        setSelectedAgents([])

        // Reload players
        await loadPlayers()
      } else {
        toast.error(result.error || "Failed to add player")
      }
    } catch (error) {
      toast.error("Failed to add player")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const result = await removePlayer(playerId)

      if (result.success) {
        toast.success("Player has been removed from the tournament.")

        // Reload players
        await loadPlayers()
      } else {
        toast.error(result.error || "Failed to remove player")
      }
    } catch (error) {
      toast.error("Failed to remove player")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Player Registration Form */}
      <Card className="border-red-500/20 shadow-lg">
        <CardHeader>
          <CardTitle>Add Player</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input id="name" placeholder="Enter player name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select onValueChange={(value) => setTier(Number.parseInt(value) as Tier)} value={tier?.toString()}>
                <SelectTrigger id="tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1</SelectItem>
                  <SelectItem value="2">Tier 2</SelectItem>
                  <SelectItem value="3">Tier 3</SelectItem>
                  <SelectItem value="4">Tier 4</SelectItem>
                  <SelectItem value="5">Tier 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Main Role</Label>
              <Select onValueChange={(value) => setRole(value as PlayerRole)} value={role || undefined}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Top Agents (Select up to 3)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedAgents.map((agent) => (
                <Badge key={agent} variant="outline" className="flex items-center gap-1 bg-secondary">
                  {agent}
                  <button
                    type="button"
                    onClick={() => handleRemoveAgent(agent)}
                    className="ml-1 rounded-full hover:bg-secondary-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((agent) => (
                  <Badge
                    key={agent}
                    variant={selectedAgents.includes(agent) ? "default" : "outline"}
                    className={`cursor-pointer ${selectedAgents.includes(agent) ? "bg-primary" : "hover:bg-secondary"}`}
                    onClick={() => (selectedAgents.includes(agent) ? handleRemoveAgent(agent) : handleAddAgent(agent))}
                  >
                    {agent}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button onClick={handleAddPlayer} disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Registered Players List */}
      <Card className="border-purple-500/20 shadow-lg">
        <CardHeader>
          <CardTitle>Registered Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No players registered yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`tier-badge tier-${player.tier}`}>{player.tier}</div>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                          <span
                            className={`role-badge ${
                              player.role === "DUELIST"
                                ? "role-duelist"
                                : player.role === "INITIATOR"
                                  ? "role-initiator"
                                  : player.role === "CONTROLLER"
                                    ? "role-controller" :
                                    player.role === "SENTINEL"
                                    ? "role-sentinel" : "role-flex"
                            }`}
                          >
                            {player.role}
                          </span>
                          <div className="flex gap-1 ml-2">
                            {player.agents.map((agentObj) => (
                              <Badge key={agentObj.id} variant="outline" className="text-xs">
                                {agentObj.agent}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlayer(player.id)}
                      disabled={player.captainId !== null}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

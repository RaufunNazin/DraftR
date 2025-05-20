"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { ROLES, TIER_STARTING_CREDITS } from "@/lib/constants";
import {
  getCaptains,
  removeCaptain,
  assignCaptain,
  getAvailableUsers,
} from "@/lib/actions/captain";
import type { ViewCaptain, Captain, User, PlayerRole, Tier } from "@/lib/types";

interface CaptainManagementProps {
  tournamentId: string;
}

export function CaptainManagement({ tournamentId }: CaptainManagementProps) {
  const { toast } = useToast();
  const [captains, setCaptains] = useState<ViewCaptain[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);
  const [role, setRole] = useState<PlayerRole | null>(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load captains
      const captainsResult = await getCaptains(tournamentId);
      if (captainsResult.success) {
        setCaptains(
          (captainsResult.captains ?? []).map((c) => ({
            ...c,
            tier: c.tier as Tier,
            players: c.players.map((p) => ({
              ...p,
              tier: p.tier as Tier,
            })),
            pickedTiers:
              c.pickedTiers?.map((pt) => ({
                ...pt,
                tier: pt.tier as Tier,
              })) ?? [],
          }))
        );
      } else {
        toast({
          title: "Error",
          description: captainsResult.error || "Failed to load captains",
          variant: "destructive",
        });
      }

      // Load available users
      const usersResult = await getAvailableUsers(tournamentId);
      if (usersResult.success) {
        setAvailableUsers(usersResult.users);
      } else {
        toast({
          title: "Error",
          description: usersResult.error || "Failed to load available users",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignCaptain = async () => {
    if (!selectedUserId || !tier || !role) {
      toast({
        title: "Missing information",
        description: "Please select a user, tier, and role.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await assignCaptain(
        tournamentId,
        selectedUserId,
        tier,
        role
      );

      if (result.success) {
        toast({
          title: "Captain assigned",
          description: "User has been assigned as a captain.",
        });

        // Reset form
        setSelectedUserId("");
        setTier(null);
        setRole(null);

        // Reload data
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to assign captain",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign captain",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCaptain = async (captainId: string) => {
    try {
      const result = await removeCaptain(captainId);

      if (result.success) {
        toast({
          title: "Captain removed",
          description: "Captain has been removed from the tournament.",
        });

        // Reload data
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove captain",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove captain",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Captain Assignment Form */}
      <Card className="border-blue-500/20 shadow-lg">
        <CardHeader>
          <CardTitle>Assign Captain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="user">Select User</label>
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="tier">Tier</label>
              <Select
                onValueChange={(value) =>
                  setTier(Number.parseInt(value) as Tier)
                }
                value={tier?.toString()}
              >
                <SelectTrigger id="tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    Tier 1 ({TIER_STARTING_CREDITS[1]} credits)
                  </SelectItem>
                  <SelectItem value="2">
                    Tier 2 ({TIER_STARTING_CREDITS[2]} credits)
                  </SelectItem>
                  <SelectItem value="3">
                    Tier 3 ({TIER_STARTING_CREDITS[3]} credits)
                  </SelectItem>
                  <SelectItem value="4">
                    Tier 4 ({TIER_STARTING_CREDITS[4]} credits)
                  </SelectItem>
                  <SelectItem value="5">
                    Tier 5 ({TIER_STARTING_CREDITS[5]} credits)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="role">Main Role</label>
              <Select
                onValueChange={(value) => setRole(value as PlayerRole)}
                value={role || undefined}
              >
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

          <Button
            onClick={handleAssignCaptain}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Captain
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Captains List */}
      <Card className="border-purple-500/20 shadow-lg">
        <CardHeader>
          <CardTitle>Tournament Captains ({captains.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : captains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No captains assigned yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {captains.map((captain) => (
                  <div
                    key={captain.id}
                    className="p-4 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`tier-badge tier-${captain.tier}`}>
                          {captain.tier}
                        </div>
                        <div className="font-medium">{captain.user.name}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCaptain(captain.id)}
                        disabled={captain.players.length > 0}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`role-badge ${
                          captain.role === "DUELIST"
                            ? "role-duelist"
                            : captain.role === "INITIATOR"
                            ? "role-initiator"
                            : captain.role === "CONTROLLER"
                            ? "role-controller"
                            : captain.role === "SENTINEL"
                            ? "role-sentinel"
                            : "role-flex"
                        }`}
                      >
                        {captain.role}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {captain.credits} credits • {captain.players.length}{" "}
                        players
                      </span>
                    </div>

                    {captain.agents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {captain.agents.map((agentObj) => (
                          <Badge
                            key={agentObj.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {agentObj.agent}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

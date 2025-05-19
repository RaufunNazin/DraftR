"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Loader2, Plus, Trash2 } from "lucide-react"
import { createTournament, getTournaments, deleteTournament } from "@/lib/actions/tournament"
import type { Tournament } from "@/lib/types"

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tournamentName, setTournamentName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Check if user is admin
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN") {
        toast({
          title: "Access Denied",
          description: "You must be an admin to access this page.",
          variant: "destructive",
        })
        router.push("/dashboard")
      } else {
        loadTournaments()
      }
    } else if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin")
    }
  }, [status, session, router, toast])

  const loadTournaments = async () => {
    setIsLoading(true)
    try {
      const result = await getTournaments()
      if (result.success) {
        setTournaments(result.tournaments)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load tournaments",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTournament = async () => {
    if (!tournamentName) {
      toast({
        title: "Missing tournament name",
        description: "Please enter a name for your tournament.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createTournament(tournamentName)

      if (result.success) {
        toast({
          title: "Tournament created",
          description: `Tournament "${tournamentName}" created with code ${result.code}.`,
        })

        setTournamentName("")
        await loadTournaments()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create tournament",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTournament = async (id: string) => {
    setIsDeletingId(id)
    try {
      const result = await deleteTournament(id)
      if (result.success) {
        toast({
          title: "Tournament deleted",
          description: "The tournament has been deleted successfully.",
        })
        await loadTournaments()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete tournament",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      })
    } finally {
      setIsDeletingId(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs">Active</span>
      case "UPCOMING":
        return <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs">Upcoming</span>
      case "COMPLETED":
        return <span className="px-2 py-1 bg-gray-500 text-white rounded-full text-xs">Completed</span>
      default:
        return <span className="px-2 py-1 bg-gray-500 text-white rounded-full text-xs">{status}</span>
    }
  }

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      <header className="container mx-auto py-6">
        <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600">
          Tournament Admin
        </h1>
      </header>

      <main className="container mx-auto flex-1 p-4">
        <Tabs defaultValue="create" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Tournament</TabsTrigger>
            <TabsTrigger value="manage">Manage Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="border-purple-500/20 shadow-lg">
              <CardHeader>
                <CardTitle>Create New Tournament</CardTitle>
                <CardDescription>Set up a new Valorant auction tournament</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter tournament name"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  onClick={handleCreateTournament}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card className="border-blue-500/20 shadow-lg">
              <CardHeader>
                <CardTitle>Manage Tournaments</CardTitle>
                <CardDescription>View and manage your existing tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                {tournaments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    <p>No tournaments created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="p-4 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-lg">{tournament.name}</h3>
                          {getStatusBadge(tournament.status)}
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span>Created: {formatDate(tournament.createdAt)}</span>
                          <span className="font-mono bg-secondary/30 px-2 py-1 rounded">Code: {tournament.code}</span>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/tournaments/${tournament.id}`)}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/auction?tournament=${tournament.code}`)}
                          >
                            View Auction
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTournament(tournament.id)}
                            disabled={isDeletingId === tournament.id}
                          >
                            {isDeletingId === tournament.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <a href="/">Back to Home</a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

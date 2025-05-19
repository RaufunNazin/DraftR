"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"
import { ArrowRight, Calendar, Loader2, Plus, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Tournament } from "@/lib/types"

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { tournaments, createTournament, loadMockTournaments, setUserRole } = useAppStore()

  const [tournamentName, setTournamentName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Load mock tournaments if none exist
  if (tournaments.length === 0) {
    loadMockTournaments()
  }

  const handleCreateTournament = () => {
    if (!tournamentName) {
      toast({
        title: "Missing tournament name",
        description: "Please enter a name for your tournament.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Simulate loading delay
    setTimeout(() => {
      const code = createTournament(tournamentName)

      toast({
        title: "Tournament created",
        description: `Tournament "${tournamentName}" created with code ${code}.`,
      })

      // Set user role to admin
      setUserRole("admin")

      setTournamentName("")
      setIsLoading(false)

      // Redirect to player registration
      router.push("/register")
    }, 1500)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const getStatusBadge = (status: Tournament["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "upcoming":
        return <Badge className="bg-blue-500">Upcoming</Badge>
      case "completed":
        return <Badge variant="outline">Completed</Badge>
    }
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
                  disabled={isLoading}
                >
                  {isLoading ? (
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
                  <ScrollArea className="h-[400px]">
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
                            <Badge variant="outline" className="font-mono">
                              Code: {tournament.code}
                            </Badge>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/auction?tournament=${tournament.code}`}>View</a>
                            </Button>
                            <Button variant="destructive" size="sm" className="opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <a href="/">Back to Home</a>
                </Button>
                <Button asChild>
                  <a href="/register">
                    Register Players
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

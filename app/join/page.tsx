"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'react-toastify'
import { emitSocketEvent } from "@/lib/socket"
import { ArrowRight, Loader2 } from "lucide-react"
import { joinTournamentByCode } from "@/lib/actions/tournament"

export default function JoinPage() {
  const router = useRouter()

  const [tournamentCode, setTournamentCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleJoinTournament = () => {
    if (!tournamentCode) {
      toast.error("Missing tournament code")
      return
    }

    setIsLoading(true)

    // Simulate loading delay
    setTimeout(async () => {
      const success = await joinTournamentByCode(tournamentCode)

      if (success) {
        // Emit socket event to join tournament
        emitSocketEvent({
          type: "auction:join",
          payload: { tournamentCode },
        })

        toast.success("Tournament joined")

        // Set user role to audience
        router.push("/auction")
      } else {
        toast.error("Invalid tournament code")
      }

      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      <header className="container mx-auto py-6">
        <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600">
          Join Tournament
        </h1>
      </header>

      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-purple-500/20 shadow-lg">
          <CardHeader>
            <CardTitle>Enter Tournament Code</CardTitle>
            <CardDescription>Join an existing tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Tournament Code</Label>
              <Input
                id="code"
                placeholder="Enter 4-character code"
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="text-center text-xl tracking-widest uppercase"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              onClick={handleJoinTournament}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

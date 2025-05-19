import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers" // Adjust the path as needed

export const metadata: Metadata = {
  title: "Valorant Team Auction",
  description: "Real-time Valorant Tournament Auction UI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

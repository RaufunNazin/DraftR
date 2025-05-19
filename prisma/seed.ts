import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { TIER_STARTING_CREDITS, TIER_STARTING_PRICES } from "../lib/constants"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting seed...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Admin user created:", admin.name)

  // Create host user
  const hostPassword = await bcrypt.hash("host123", 10)
  const host = await prisma.user.upsert({
    where: { email: "host@example.com" },
    update: {},
    create: {
      email: "host@example.com",
      name: "Host User",
      password: hostPassword,
      role: "HOST",
    },
  })
  console.log("Host user created:", host.name)

  // Create captain users
  const captainNames = ["FNS", "Vanity", "Dephh", "Zander", "Poised"]
  const captainTiers = [1, 2, 3, 4, 5]
  const captainRoles = ["CONTROLLER", "CONTROLLER", "SENTINEL", "CONTROLLER", "DUELIST"]
  const captainAgents = [
    ["Omen", "Brimstone", "Viper"],
    ["Omen", "Brimstone", "Astra"],
    ["Cypher", "Killjoy", "Chamber"],
    ["Omen", "Astra", "Harbor"],
    ["Jett", "Raze", "Reyna"],
  ]

  const captainUsers = []

  for (let i = 0; i < captainNames.length; i++) {
    const captainPassword = await bcrypt.hash("captain123", 10)
    const captain = await prisma.user.upsert({
      where: { email: `${captainNames[i].toLowerCase()}@example.com` },
      update: {},
      create: {
        email: `${captainNames[i].toLowerCase()}@example.com`,
        name: captainNames[i],
        password: captainPassword,
        role: "CAPTAIN",
      },
    })
    captainUsers.push(captain)
    console.log("Captain user created:", captain.name)
  }

  // Create audience users
  const audiencePassword = await bcrypt.hash("audience123", 10)
  const audience = await prisma.user.upsert({
    where: { email: "audience@example.com" },
    update: {},
    create: {
      email: "audience@example.com",
      name: "Audience User",
      password: audiencePassword,
      role: "AUDIENCE",
    },
  })
  console.log("Audience user created:", audience.name)

  // Create a tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: "VCT Champions 2023",
      code: "VCT1",
      status: "UPCOMING",
      hostId: host.id,
      participants: {
        connect: [
          { id: admin.id },
          { id: host.id },
          ...captainUsers.map((user) => ({ id: user.id })),
          { id: audience.id },
        ],
      },
    },
  })
  console.log("Tournament created:", tournament.name)

  // Assign captains to the tournament
  for (let i = 0; i < captainUsers.length; i++) {
    const captain = await prisma.captain.create({
      data: {
        userId: captainUsers[i].id,
        tournamentId: tournament.id,
        tier: captainTiers[i],
        role: captainRoles[i],
        credits: TIER_STARTING_CREDITS[captainTiers[i]],
        agents: {
          create: captainAgents[i].map((agent) => ({
            agent,
          })),
        },
      },
    })
    console.log("Captain assigned:", captainUsers[i].name)
  }

  // Create players
  const playerNames = [
    // Tier 1 Players
    "TenZ",
    "Yay",
    "Derke",
    "Cryocells",
    "Aspas",
    // Tier 2 Players
    "Boaster",
    "Marved",
    "Sacy",
    "Shao",
    "Chronicle",
    // Tier 3 Players
    "Crashies",
    "Ardiis",
    "Ange1",
    "Mistic",
    "Nivera",
    // Tier 4 Players
    "Subroza",
    "Hiko",
    "Scream",
    "Sinatraa",
    "Shahzam",
    // Tier 5 Players
    "Steel",
    "Dapr",
    "Zombs",
    "Sick",
    "Nitro",
  ]

  const playerTiers = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5]

  const playerRoles = [
    "DUELIST",
    "DUELIST",
    "DUELIST",
    "DUELIST",
    "DUELIST",
    "CONTROLLER",
    "CONTROLLER",
    "INITIATOR",
    "INITIATOR",
    "SENTINEL",
    "INITIATOR",
    "DUELIST",
    "CONTROLLER",
    "CONTROLLER",
    "SENTINEL",
    "DUELIST",
    "INITIATOR",
    "DUELIST",
    "DUELIST",
    "INITIATOR",
    "SENTINEL",
    "SENTINEL",
    "CONTROLLER",
    "DUELIST",
    "CONTROLLER",
  ]

  const playerAgents = [
    ["Jett", "Reyna", "Raze"],
    ["Jett", "Chamber", "Reyna"],
    ["Jett", "Raze", "Reyna"],
    ["Jett", "Chamber", "Operator"],
    ["Jett", "Raze", "Reyna"],
    ["Astra", "Omen", "Brimstone"],
    ["Astra", "Omen", "Brimstone"],
    ["Sova", "Fade", "Breach"],
    ["Sova", "Fade", "Breach"],
    ["Killjoy", "Chamber", "Cypher"],
    ["Sova", "KAY/O", "Skye"],
    ["Jett", "Chamber", "Operator"],
    ["Omen", "Brimstone", "Viper"],
    ["Viper", "Omen", "Brimstone"],
    ["Killjoy", "Cypher", "Sage"],
    ["Skye", "Phoenix", "Reyna"],
    ["Sova", "Viper", "Breach"],
    ["Jett", "Reyna", "Phoenix"],
    ["Raze", "Sova", "Phoenix"],
    ["Jett", "Sova", "Operator"],
    ["Killjoy", "Cypher", "Sage"],
    ["Cypher", "Killjoy", "Chamber"],
    ["Astra", "Omen", "Brimstone"],
    ["Phoenix", "Sage", "Raze"],
    ["Omen", "Viper", "Astra"],
  ]

  for (let i = 0; i < playerNames.length; i++) {
    const player = await prisma.player.create({
      data: {
        name: playerNames[i],
        tier: playerTiers[i],
        role: playerRoles[i],
        startingPrice: TIER_STARTING_PRICES[playerTiers[i]],
        tournamentId: tournament.id,
        agents: {
          create: playerAgents[i].map((agent) => ({
            agent,
          })),
        },
      },
    })
    console.log("Player created:", player.name)
  }

  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

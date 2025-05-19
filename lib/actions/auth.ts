"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * Register a new user
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: "AUDIENCE" | "CAPTAIN" = "AUDIENCE",
) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, error: "Email already in use" }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    })

    // If user is a captain, create captain profile
    if (role === "CAPTAIN") {
      // Note: Captain profile will be created when they join a tournament
    }

    return { success: true, userId: user.id }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Failed to register user" }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(name: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    })

    revalidatePath("/profile")
    return { success: true }
  } catch (error) {
    console.error("Profile update error:", error)
    return { success: false, error: "Failed to update profile" }
  }
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return { success: true }
  } catch (error) {
    console.error("Password change error:", error)
    return { success: false, error: "Failed to change password" }
  }
}

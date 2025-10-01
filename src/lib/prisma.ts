import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database connection configuration
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://placeholder',
    },
  },
  // Configure connection timeout and retry logic
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
}

// Initialize Prisma client (with placeholder URL during build if needed)
export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig as Prisma.PrismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Enhanced connection management for SQLite
export async function connectToDatabase() {
  try {
    await prisma.$connect()
    return { success: true }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { success: false, error }
  }
}

// Graceful disconnect with retry logic
export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect()
    return { success: true }
  } catch (error) {
    console.error('Database disconnect failed:', error)
    return { success: false, error }
  }
}

// Database health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { healthy: false, error }
  }
}
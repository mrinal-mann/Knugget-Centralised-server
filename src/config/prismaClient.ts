import { PrismaClient } from "@prisma/client";

// Add better logging for database connection issues
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Test database connection on startup
async function testConnection() {
  try {
    // Attempt to query the database
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit if database is not accessible
  }
}

// Run the test connection (don't wait for it)
testConnection();

export default prisma;

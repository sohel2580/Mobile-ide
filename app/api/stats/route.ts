import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

// Use globalThis for better compatibility across environments (Node.js/Edge)
const globalStats = globalThis as any;

if (!globalStats.activeUsers) {
  globalStats.activeUsers = new Map<string, number>();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = body.clientId || "anonymous";
    const now = Date.now();
    
    // Update last seen time for active user tracking (in-memory is fine for this)
    globalStats.activeUsers.set(clientId, now);

    // Clean up inactive users (e.g., no ping for 30 seconds)
    const timeout = 30 * 1000;
    let activeCount = 0;
    for (const [id, lastSeen] of globalStats.activeUsers.entries()) {
      if (now - lastSeen > timeout) {
        globalStats.activeUsers.delete(id);
      } else {
        activeCount++;
      }
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("koragpt");
    const collection = db.collection("stats");

    // Check if user has already visited today using cookies
    const cookieStore = await cookies();
    const hasVisited = cookieStore.get("kora_visited");

    let totalUsersCount = 1; // Fallback value

    if (!hasVisited) {
      // User hasn't visited today, increment the counter in DB
      const result = await collection.findOneAndUpdate(
        { id: "site_stats" },
        { $inc: { totalViewers: 1 } },
        { upsert: true, returnDocument: "after" }
      );
      
      totalUsersCount = result?.totalViewers || 1;
      
      // Set cookie to expire in 24 hours to prevent spamming
      cookieStore.set("kora_visited", "true", { 
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        path: '/'
      });
    } else {
      // Just fetch the current count
      const doc = await collection.findOne({ id: "site_stats" });
      totalUsersCount = doc?.totalViewers || 1;
    }

    return NextResponse.json({
      activeUsers: Math.max(1, activeCount),
      totalUsers: totalUsersCount,
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    // Always return a valid response to prevent 500 errors in browser console
    return NextResponse.json({ 
      activeUsers: 1, 
      totalUsers: 1 
    }, { status: 200 });
  }
}


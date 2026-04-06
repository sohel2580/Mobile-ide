import { NextResponse } from "next/server";

// Use globalThis for better compatibility across environments (Node.js/Edge)
const globalStats = globalThis as any;

if (!globalStats.activeUsers) {
  globalStats.activeUsers = new Map<string, number>();
}
if (typeof globalStats.totalUsers === "undefined") {
  globalStats.totalUsers = 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = body.clientId || "anonymous";

    const now = Date.now();
    
    // If it's a new user, increment total users
    if (!globalStats.activeUsers.has(clientId)) {
      globalStats.totalUsers++;
    }
    
    // Update last seen time
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

    return NextResponse.json({
      activeUsers: Math.max(1, activeCount),
      totalUsers: Math.max(1, globalStats.totalUsers),
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

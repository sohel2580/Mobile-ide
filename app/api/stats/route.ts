import { NextResponse } from "next/server";

const globalStats = global as unknown as {
  activeUsers: Map<string, number>;
  totalUsers: number;
};

if (!globalStats.activeUsers) {
  globalStats.activeUsers = new Map<string, number>();
}
if (typeof globalStats.totalUsers === "undefined") {
  globalStats.totalUsers = 0;
}

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json();
    
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

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
      activeUsers: activeCount,
      totalUsers: globalStats.totalUsers,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

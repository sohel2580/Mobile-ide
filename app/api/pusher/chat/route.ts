import { NextResponse } from "next/server";
import Pusher from "pusher";
import clientPromise from "@/lib/mongodb";

// Initialize the server-side Pusher instance
// Using non-null assertions or fallback to empty strings.
// Vercel / Next.js API routes will read from process.env directly.
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2", // Default to ap2 if missing
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sender, content, clientId } = body;

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const newMessage = {
      id: Math.random().toString(36).substring(2, 15),
      sender: sender || "Anonymous",
      content,
      clientId, // To identify who sent the message and prevent echo
      timestamp: new Date().toISOString(),
      createdAt: new Date(), // Important for MongoDB TTL Index
    };

    // 1. Save to MongoDB (Optional but recommended for persistence)
    try {
      const client = await clientPromise;
      const db = client.db("koragpt");
      const collection = db.collection("community_messages");
      await collection.insertOne(newMessage);
    } catch (dbError) {
      console.error("Failed to save message to DB:", dbError);
    }

    // 2. Trigger Pusher event on 'community-chat' channel with 'new-message' event
    try {
      if (process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY) {
        await pusher.trigger("community-chat", "new-message", newMessage);
      } else {
        console.warn("Pusher keys missing. Skipping event trigger.");
      }
    } catch (pusherError) {
      console.error("Failed to trigger Pusher event:", pusherError);
      return NextResponse.json({ error: "Failed to broadcast message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Pusher Chat API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

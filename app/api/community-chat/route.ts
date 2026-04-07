import { NextResponse } from "next/server";
import Pusher from "pusher";
import clientPromise from "@/lib/mongodb";

// Initialize Pusher. We will use dummy keys for local development if real ones are missing.
// For production, the user MUST provide these in .env
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "local_dummy_app_id",
  key: process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || "local_dummy_key",
  secret: process.env.PUSHER_SECRET || "local_dummy_secret",
  cluster: process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
  useTLS: true,
});

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("koragpt");
    const collection = db.collection("community_messages");
    
    // Create TTL Index for 5 minutes (300 seconds) if it doesn't exist
    // This tells MongoDB to automatically delete documents 5 minutes after their createdAt time
    await collection.createIndex(
      { "createdAt": 1 },
      { expireAfterSeconds: 300 }
    );
    
    // Fetch last 50 messages, filtering out any that might be older than 5 mins
    // just in case the MongoDB TTL background process hasn't deleted them yet
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const messages = await collection.find({ createdAt: { $gte: fiveMinsAgo } })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

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
      clientId, // To identify who sent the message
      timestamp: new Date().toISOString(),
    };

    // 1. Save to MongoDB
    try {
      const client = await clientPromise;
      const db = client.db("koragpt");
      const collection = db.collection("community_messages");
      await collection.insertOne(newMessage);
    } catch (dbError) {
      console.error("Failed to save message to DB:", dbError);
      // Continue anyway to send the realtime event
    }

    // 2. Trigger Pusher event
    try {
      await pusher.trigger("community-chat", "new-message", newMessage);
    } catch (pusherError) {
      console.error("Failed to trigger Pusher event:", pusherError);
      // In local dev without keys, Pusher will fail. We just return success anyway
      // so the UI can optimistically update.
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("koragpt");
    const collection = db.collection("community_messages");
    
    await collection.deleteMany({});
    
    return NextResponse.json({ success: true, message: "All messages deleted" });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
  }
}

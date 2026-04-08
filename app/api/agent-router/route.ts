import { NextResponse } from "next/server";

// Use Node runtime for maximum compatibility with streaming + env vars.
export const runtime = "nodejs";

// Allow override via env in case upstream URL changes.
// Fallback is aligned with the previously used Agent Router endpoint.
const UPSTREAM_URL =
  process.env.AGENT_ROUTER_API_URL?.trim() || "https://agentrouter.org/v1/chat/completions";

type AgentRouterRequestBody = {
  messages: Array<{ role: string; content: string }>;
  modelId: string;
  // When provided, we use it directly (no built-in daily limit applies).
  userApiKey?: string | null;
};

export async function POST(req: Request) {
  try {
    const { messages, modelId, userApiKey } = (await req.json()) as AgentRouterRequestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { message: "Missing or invalid 'messages'." } },
        { status: 400 }
      );
    }

    if (!modelId || typeof modelId !== "string") {
      return NextResponse.json(
        { error: { message: "Missing or invalid 'modelId'." } },
        { status: 400 }
      );
    }

    let selectedKey = typeof userApiKey === "string" ? userApiKey.trim() : "";

    // Dual-mode:
    // - If userApiKey exists: use it directly.
    // - Otherwise: pick one built-in key from env for load-balancing.
    if (!selectedKey) {
      const env = process.env.AGENT_ROUTER_KEYS || "";
      const keys = env
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      if (keys.length === 0) {
        return NextResponse.json(
          {
            error: {
              message:
                "Agent Router keys are not configured. Please set AGENT_ROUTER_KEYS in environment variables.",
            },
          },
          { status: 500 }
        );
      }

      selectedKey = keys[Math.floor(Math.random() * keys.length)];
    }

    // AgentRouter uses additional client fingerprint headers to allow requests.
    // RooCode-compatible headers (from public workaround references).
    const upstreamRes = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        // Avoid brotli (br) streaming issues; we want raw SSE text bytes.
        "Accept-Encoding": "identity",
        "Content-Type": "application/json",
        Authorization: `Bearer ${selectedKey}`,
        Accept: "text/event-stream",
        // Client fingerprint headers (helps avoid "unauthorized client detected").
        "User-Agent": "RooCode/3.34.8",
        "HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
        "X-Title": "Roo Code",
        "X-Stainless-Runtime-Version": "v22.20.0",
        "X-Stainless-Runtime": "node",
        "X-Stainless-Arch": "x64",
        "X-Stainless-OS": "Linux",
        "X-Stainless-Lang": "js",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        // Request a streaming response compatible with OpenAI SSE format.
        stream: true,
      }),
    });

    // If upstream failed, return a JSON error for the client to handle.
    if (!upstreamRes.ok || !upstreamRes.body) {
      const text = await upstreamRes.text().catch(() => "");
      let message = text || `Agent Router request failed (HTTP ${upstreamRes.status}).`;
      if (text) {
        try {
          const parsed = JSON.parse(text) as any;
          message =
            parsed?.error?.message ||
            parsed?.message ||
            parsed?.error?.raw?.message ||
            message;
        } catch {
          // Keep raw text as message.
        }
      }
      return NextResponse.json(
        {
          error: {
            message,
          },
        },
        { status: upstreamRes.status }
      );
    }

    // Stream-through (no JSON re-wrapping). Client will parse SSE.
    const headers = new Headers(upstreamRes.headers);
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("Connection", "keep-alive");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Agent Router Proxy Error";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}


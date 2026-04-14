import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTREAM_URL =
  process.env.AGENT_ROUTER_API_URL?.trim() || "https://agentrouter.org/v1/chat/completions";

const REQUEST_TIMEOUT_MS = 90_000;

type AgentRouterRequestBody = {
  messages: Array<{ role: string; content: string }>;
  modelId: string;
  userApiKey?: string | null;
  stream?: boolean;
};

function extractContent(data: any): string {
  if (!data) return "";

  const msg = data?.choices?.[0]?.message;
  if (msg) {
    const text =
      msg.content ||
      msg.reasoning_content ||
      msg.reasoning ||
      msg.text ||
      "";
    if (text && typeof text === "string" && text.trim()) return text.trim();
  }

  if (data?.choices?.[0]?.text) {
    return String(data.choices[0].text).trim();
  }

  if (data?.content && typeof data.content === "string") {
    return data.content.trim();
  }

  if (data?.text && typeof data.text === "string") {
    return data.text.trim();
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentRouterRequestBody;
    const { messages, modelId, userApiKey, stream } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { message: "Missing or invalid 'messages'." } },
        { status: 400 }
      );
    }

    if (!modelId || typeof modelId !== "string" || !modelId.trim()) {
      return NextResponse.json(
        { error: { message: "Missing or invalid 'modelId'." } },
        { status: 400 }
      );
    }

    let selectedKey = typeof userApiKey === "string" ? userApiKey.trim() : "";

    if (!selectedKey) {
      const env = process.env.AGENT_ROUTER_KEYS || "";
      const keys = env.split(",").map((k) => k.trim()).filter(Boolean);

      if (keys.length === 0) {
        return NextResponse.json(
          {
            error: {
              message:
                "No API key provided and AGENT_ROUTER_KEYS is not configured. Please add your Agent Router API key in settings.",
            },
          },
          { status: 401 }
        );
      }

      selectedKey = keys[Math.floor(Math.random() * keys.length)];
    }

    const wantStream = stream === true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(UPSTREAM_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Accept-Encoding": "identity",
          "Content-Type": "application/json",
          Authorization: `Bearer ${selectedKey}`,
          Accept: wantStream ? "text/event-stream" : "application/json",
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
          model: modelId.trim(),
          messages,
          stream: wantStream,
        }),
      });
    } catch (fetchErr: any) {
      const isTimeout = fetchErr?.name === "AbortError";
      return NextResponse.json(
        {
          error: {
            message: isTimeout
              ? "Agent Router request timed out after 90 seconds. Please try again."
              : `Network error reaching Agent Router: ${fetchErr?.message || "Unknown error"}`,
          },
        },
        { status: 504 }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!upstreamRes.ok) {
      const rawText = await upstreamRes.text().catch(() => "");
      console.error(`[agent-router] upstream HTTP ${upstreamRes.status}:`, rawText);

      let message = `Agent Router returned HTTP ${upstreamRes.status}.`;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText) as any;
          message =
            parsed?.error?.message ||
            parsed?.message ||
            parsed?.error?.raw?.message ||
            rawText;
        } catch {
          message = rawText;
        }
      }

      return NextResponse.json({ error: { message } }, { status: upstreamRes.status });
    }

    if (!upstreamRes.body) {
      return NextResponse.json(
        { error: { message: "Agent Router returned an empty response body." } },
        { status: 502 }
      );
    }

    if (wantStream) {
      const headers = new Headers();
      headers.set("Content-Type", "text/event-stream; charset=utf-8");
      headers.set("Cache-Control", "no-cache, no-transform");
      headers.set("Connection", "keep-alive");
      return new Response(upstreamRes.body, { status: 200, headers });
    }

    const rawText = await upstreamRes.text().catch(() => "");

    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[agent-router] Could not parse JSON response:", rawText.slice(0, 500));
      if (rawText.trim()) {
        return NextResponse.json(
          {
            choices: [{ message: { content: rawText.trim() } }],
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: { message: "Agent Router returned a non-JSON response. Check your API key and model ID." } },
        { status: 502 }
      );
    }

    if (data?.error) {
      const message =
        data.error?.message || data.error?.raw?.message || JSON.stringify(data.error);
      console.error("[agent-router] upstream error in response:", message);
      return NextResponse.json({ error: { message } }, { status: 400 });
    }

    const content = extractContent(data);
    console.log(`[agent-router] model=${modelId} content_length=${content.length} raw_keys=${Object.keys(data || {}).join(",")}`);

    if (!content) {
      console.error("[agent-router] Empty content. Raw response:", JSON.stringify(data).slice(0, 1000));
      return NextResponse.json(
        {
          error: {
            message: `Agent Router returned an empty response for model "${modelId}". The model may be unavailable or the model ID may be incorrect.`,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        choices: [{ message: { content } }],
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Agent Router Proxy Error";
    console.error("[agent-router] unhandled error:", message);
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}

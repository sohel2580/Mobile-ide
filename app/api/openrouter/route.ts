import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, model, messages } = await req.json();

    if (!apiKey || !model || !messages) {
      return NextResponse.json(
        { error: { message: "Missing apiKey, model, or messages." } },
        { status: 400 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://koragpt.vercel.app",
        "X-Title": "KoraGPT IDE",
      },
      body: JSON.stringify({ model, messages }),
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const hint = retryAfter
        ? `Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`
        : "Rate limit exceeded. Please wait a moment and try again.";
      return NextResponse.json(
        { error: { message: hint, code: "rate_limited", retryAfter }, raw: data },
        { status: 429 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal OpenRouter Proxy Error";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}


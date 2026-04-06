import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { targetUrl, method = "POST", headers = {}, body } = await req.json();

    if (!targetUrl) {
      return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (method !== "GET" && method !== "HEAD" && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: error.message || "Internal Proxy Error" }, { status: 500 });
  }
}

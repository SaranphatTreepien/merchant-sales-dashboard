import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim())
      return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId)
      return NextResponse.json({ error: "Telegram not configured" }, { status: 500 });

    const text = `🚨 *แจ้งปัญหา — Sales Dashboard*\n\n👤 *โดย:* ${user.name} (${user.role})\n\n💬 *ปัญหา:*\n${message.trim()}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[report-issue] Telegram error:", err);
      return NextResponse.json({ error: "Telegram error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[report-issue] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
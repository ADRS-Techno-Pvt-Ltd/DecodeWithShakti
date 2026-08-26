import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { sendContactMessage } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await sendContactMessage(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "Could not send your message right now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

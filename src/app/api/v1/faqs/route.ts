import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { faqInputSchema } from "@/lib/validation/faq";

/**
 * Public by default — returns published FAQs in display order for the landing page.
 * `?all=true` requires admin and returns every FAQ (published or not) for the admin panel.
 */
export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "true";
    if (all) {
      await requireAdmin();
      const faqs = await prisma.faqItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json(faqs);
    }

    const faqs = await prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(faqs);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const raw = await request.json();
    const parsed = faqInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // New items land at the end of the list unless an explicit order was given.
    const sortOrder =
      raw?.sortOrder != null
        ? parsed.data.sortOrder
        : ((await prisma.faqItem.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;

    const faq = await prisma.faqItem.create({ data: { ...parsed.data, sortOrder } });
    return NextResponse.json(faq, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

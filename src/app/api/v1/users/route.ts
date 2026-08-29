import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  try {
    await requireAdmin();
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        caRegistrationNumber: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

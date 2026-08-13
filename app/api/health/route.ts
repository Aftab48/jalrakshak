import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "jalrakshak", database: "reachable" });
  } catch {
    return NextResponse.json({ ok: false, service: "jalrakshak", database: "unreachable" }, { status: 503 });
  }
}

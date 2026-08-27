import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";

/** Machine-readable API description. Rendered by Swagger UI at `/api-docs`. */
export function GET() {
  return NextResponse.json(openApiDocument, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

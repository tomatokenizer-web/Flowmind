import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";

type ExportFormat = "json" | "markdown" | "prompt_package";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contextId: string }> },
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contextId } = await params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json") as ExportFormat;
  const limit = parseInt(url.searchParams.get("limit") ?? "200");

  // Fetch context + units
  const context = await db.context.findFirst({
    where: {
      id: contextId,
      project: { userId: session.user.id! },
    },
    include: {
      unitContexts: {
        include: {
          unit: {
            select: {
              id: true, content: true, unitType: true, lifecycle: true,
              createdAt: true, originType: true, sourceUrl: true,
            },
          },
        },
        take: limit,
      },
    },
  });

  if (!context) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  const units = context.unitContexts.map((uc) => uc.unit);

  if (format === "json") {
    return NextResponse.json({ context: { id: context.id, name: context.name }, units });
  }

  if (format === "markdown") {
    const lines = [`# ${context.name}\n`];
    const byType = units.reduce((acc, u) => {
      acc[u.unitType] = acc[u.unitType] ?? [];
      acc[u.unitType]!.push(u);
      return acc;
    }, {} as Record<string, typeof units>);

    for (const [type, typeUnits] of Object.entries(byType)) {
      lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`);
      for (const u of typeUnits) {
        lines.push(`- ${u.content}`);
      }
      lines.push("");
    }
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/markdown" },
    });
  }

  if (format === "prompt_package") {
    const claims = units.filter((u) => u.unitType === "claim");
    const evidence = units.filter((u) => u.unitType === "evidence");
    const questions = units.filter((u) => u.unitType === "question");
    const assumptions = units.filter((u) => u.unitType === "assumption");

    const prompt = [
      `## Background\n${context.snapshot || `Context: ${context.name}`}`,
      claims.length ? `\n## Key Claims\n${claims.map((u, i) => `${i + 1}. ${u.content}`).join("\n")}` : "",
      evidence.length ? `\n## Supporting Evidence\n${evidence.map((u) => `- ${u.content}`).join("\n")}` : "",
      assumptions.length ? `\n## Assumptions\n${assumptions.map((u) => `- ${u.content}`).join("\n")}` : "",
      questions.length ? `\n## Open Questions\n${questions.map((u) => `- ${u.content}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");

    return new NextResponse(prompt, { headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}

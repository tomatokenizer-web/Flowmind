import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { createExportService } from "@/server/services/exportService";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assemblyId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assemblyId } = await params;

  try {
    const exportService = createExportService(db);
    const pdfBuffer = await exportService.exportToPDF(assemblyId, session.user.id!);

    // Fetch assembly name for the filename
    const assembly = await db.assembly.findFirst({
      where: { id: assemblyId, project: { userId: session.user.id! } },
      select: { name: true },
    });

    const safeName = (assembly?.name ?? "assembly")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

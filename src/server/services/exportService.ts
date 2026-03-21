import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { jsPDF } from "jspdf";
import { logger } from "@/server/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssemblyExportData {
  name: string;
  description: string | null;
  items: {
    content: string;
    unitType: string;
    bridgeText: string | null;
    position: number;
  }[];
}

// ─── Service Factory ─────────────────────────────────────────────────────────

export function createExportService(db: PrismaClient) {
  /**
   * Fetch assembly content for export, verifying ownership.
   */
  async function getAssemblyData(
    assemblyId: string,
    userId: string,
  ): Promise<AssemblyExportData> {
    const assembly = await db.assembly.findFirst({
      where: {
        id: assemblyId,
        project: { userId },
      },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            unit: {
              select: { id: true, content: true, unitType: true },
            },
          },
        },
      },
    });

    if (!assembly) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assembly not found or access denied",
      });
    }

    const sourceMap = assembly.sourceMap as Record<string, unknown> | null;

    return {
      name: assembly.name,
      description: (sourceMap?.description as string) ?? null,
      items: assembly.items
        .filter((item) => item.unit !== null)
        .map((item) => ({
          content: item.unit!.content,
          unitType: item.unit!.unitType,
          bridgeText: item.bridgeText,
          position: item.position,
        })),
    };
  }

  /**
   * Generate a PDF from assembly content.
   * Returns a Buffer containing the PDF bytes.
   */
  async function exportToPDF(
    assemblyId: string,
    userId: string,
  ): Promise<Buffer> {
    const data = await getAssemblyData(assemblyId, userId);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const marginTop = 25;
    const marginBottom = 20;
    const maxWidth = pageWidth - marginLeft - marginRight;
    let y = marginTop;

    function checkPageBreak(neededHeight: number) {
      if (y + neededHeight > pageHeight - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
    }

    // ─── Title ───────────────────────────────────────────────────────

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(data.name, maxWidth) as string[];
    checkPageBreak(titleLines.length * 8);
    doc.text(titleLines, marginLeft, y);
    y += titleLines.length * 8 + 4;

    // ─── Description ────────────────────────────────────────────────

    if (data.description) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(data.description, maxWidth) as string[];
      checkPageBreak(descLines.length * 5);
      doc.text(descLines, marginLeft, y);
      y += descLines.length * 5 + 6;
      doc.setTextColor(0, 0, 0);
    }

    // ─── Separator ──────────────────────────────────────────────────

    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 8;

    // ─── Content ────────────────────────────────────────────────────

    for (const item of data.items) {
      // Unit type badge
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      const badge = item.unitType.toUpperCase();
      checkPageBreak(6);
      doc.text(badge, marginLeft, y);
      y += 5;

      // Unit content
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const contentLines = doc.splitTextToSize(item.content, maxWidth) as string[];

      for (const line of contentLines) {
        checkPageBreak(6);
        doc.text(line, marginLeft, y);
        y += 5;
      }
      y += 2;

      // Bridge text (connecting text between units)
      if (item.bridgeText) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(80, 80, 80);
        const bridgeLines = doc.splitTextToSize(item.bridgeText, maxWidth) as string[];

        for (const line of bridgeLines) {
          checkPageBreak(5);
          doc.text(line, marginLeft, y);
          y += 5;
        }
        doc.setTextColor(0, 0, 0);
        y += 3;
      }

      y += 4;
    }

    // ─── Footer ─────────────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );
      doc.text(
        `Exported from FlowMind`,
        marginLeft,
        pageHeight - 10,
      );
      doc.text(
        new Date().toLocaleDateString(),
        pageWidth - marginRight,
        pageHeight - 10,
        { align: "right" },
      );
    }

    logger.info({ assemblyId, unitCount: data.items.length }, "PDF export generated");

    // Get PDF as ArrayBuffer and convert to Node Buffer
    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }

  return {
    getAssemblyData,
    exportToPDF,
  };
}

export type ExportService = ReturnType<typeof createExportService>;

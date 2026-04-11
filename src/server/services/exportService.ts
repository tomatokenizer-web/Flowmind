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

  /**
   * Generate a styled standalone HTML page from assembly content.
   */
  async function exportToHTML(
    assemblyId: string,
    userId: string,
  ): Promise<string> {
    const data = await getAssemblyData(assemblyId, userId);

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const itemsHtml = data.items
      .map((item) => {
        const bridgeHtml = item.bridgeText
          ? `<p class="bridge">${escapeHtml(item.bridgeText)}</p>`
          : "";
        return `<div class="unit">
      <span class="unit-type">${escapeHtml(item.unitType)}</span>
      <p class="unit-content">${escapeHtml(item.content)}</p>
      ${bridgeHtml}
    </div>`;
      })
      .join("\n  ");

    const descriptionHtml = data.description
      ? `<p class="description">${escapeHtml(data.description)}</p>`
      : "";

    const exportDate = new Date().toLocaleDateString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
    h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    .description { color: #6b7280; font-style: italic; margin-bottom: 2rem; }
    .unit { margin-bottom: 1.5rem; }
    .unit-type { display: inline-block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6b7280; background: #f3f4f6; padding: 0.125rem 0.5rem; border-radius: 0.25rem; margin-bottom: 0.25rem; }
    .unit-content { margin: 0; }
    .bridge { color: #9ca3af; font-style: italic; margin: 0.5rem 0; padding-left: 1rem; border-left: 2px solid #e5e7eb; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.name)}</h1>
  ${descriptionHtml}
  ${itemsHtml}
  <footer>Exported from FlowMind &middot; ${exportDate}</footer>
</body>
</html>`;

    logger.info({ assemblyId, unitCount: data.items.length }, "HTML export generated");
    return html;
  }

  /**
   * Generate a structured JSON export of assembly content.
   */
  async function exportToJSON(
    assemblyId: string,
    userId: string,
  ): Promise<string> {
    const data = await getAssemblyData(assemblyId, userId);

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      assembly: {
        name: data.name,
        description: data.description,
        items: data.items.map((item) => ({
          position: item.position,
          unitType: item.unitType,
          content: item.content,
          bridgeText: item.bridgeText,
        })),
      },
    };

    logger.info({ assemblyId, unitCount: data.items.length }, "JSON export generated");
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate a Markdown document from assembly content.
   * Per DEC-2026-002 §15: markdown is an MVP export format.
   */
  async function exportToMarkdown(
    assemblyId: string,
    userId: string,
  ): Promise<string> {
    const data = await getAssemblyData(assemblyId, userId);

    const lines: string[] = [];
    lines.push(`# ${data.name}`);
    lines.push("");

    if (data.description) {
      lines.push(`_${data.description}_`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");

    for (const item of data.items) {
      lines.push(`**${item.unitType.toUpperCase()}**`);
      lines.push("");
      lines.push(item.content);
      lines.push("");
      if (item.bridgeText) {
        lines.push(`> ${item.bridgeText}`);
        lines.push("");
      }
    }

    lines.push("---");
    lines.push(
      `_Exported from FlowMind · ${new Date().toLocaleDateString()}_`,
    );

    const markdown = lines.join("\n");
    logger.info(
      { assemblyId, unitCount: data.items.length },
      "Markdown export generated",
    );
    return markdown;
  }

  /**
   * Generate a plain-text document from assembly content.
   * Per DEC-2026-002 §15: plaintext is an MVP export format.
   */
  async function exportToPlaintext(
    assemblyId: string,
    userId: string,
  ): Promise<string> {
    const data = await getAssemblyData(assemblyId, userId);

    const lines: string[] = [];
    lines.push(data.name);
    lines.push("=".repeat(Math.min(data.name.length, 60)));
    lines.push("");

    if (data.description) {
      lines.push(data.description);
      lines.push("");
    }

    for (const item of data.items) {
      lines.push(`[${item.unitType.toUpperCase()}]`);
      lines.push(item.content);
      if (item.bridgeText) {
        lines.push("");
        lines.push(`  ${item.bridgeText}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push(`Exported from FlowMind — ${new Date().toLocaleDateString()}`);

    const plaintext = lines.join("\n");
    logger.info(
      { assemblyId, unitCount: data.items.length },
      "Plaintext export generated",
    );
    return plaintext;
  }

  return {
    getAssemblyData,
    exportToPDF,
    exportToHTML,
    exportToJSON,
    exportToMarkdown,
    exportToPlaintext,
  };
}

export type ExportService = ReturnType<typeof createExportService>;

import { NextRequest, NextResponse } from 'next/server';
import type { AuditReport } from '@/lib/seo-types';
import { rateLimitResponse } from '@/lib/rate-limit';
import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 30 PDF-экспортов в минуту на IP — лёгкая операция, лимит мягкий.
const RATE_LIMIT = { routeId: 'export', max: 30, windowMs: 60_000 };

// Пути к TTF-шрифтам с поддержкой кириллицы
const FONT_REGULAR = join(process.cwd(), 'public', 'DejaVuSans.ttf');
const FONT_BOLD = join(process.cwd(), 'public', 'DejaVuSans-Bold.ttf');

let fontRegularBuf: Buffer | null = null;
let fontBoldBuf: Buffer | null = null;

async function loadFonts() {
  if (!fontRegularBuf) {
    fontRegularBuf = await readFile(FONT_REGULAR);
  }
  if (!fontBoldBuf) {
    fontBoldBuf = await readFile(FONT_BOLD);
  }
  return { regular: fontRegularBuf!, bold: fontBoldBuf! };
}

function severityColor(sev: string): [number, number, number] {
  switch (sev) {
    case 'critical':
      return [0.86, 0.15, 0.15]; // #dc2626
    case 'warning':
      return [0.85, 0.47, 0.02]; // #d97706
    case 'info':
      return [0.15, 0.39, 0.92]; // #2563eb
    default:
      return [0.10, 0.64, 0.29]; // #16a34a
  }
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return [0.10, 0.64, 0.29];
  if (score >= 60) return [0.85, 0.47, 0.02];
  if (score >= 40) return [0.86, 0.15, 0.15];
  return [0.60, 0.11, 0.11];
}

function escapeText(s: string): string {
  return String(s ?? '').replace(/\r/g, '');
}

interface LineSpec {
  text: string;
  size: number;
  color: [number, number, number];
  bold: boolean;
  gapBefore?: number;
  indent?: number;
}

function buildPdf(report: AuditReport, fonts: { regular: Buffer; bold: Buffer }): Buffer {
  const lines: LineSpec[] = [];

  // Заголовок отчёта
  lines.push({ text: 'AI SEO Audit Report', size: 22, color: [0.04, 0.05, 0.07], bold: true, gapBefore: 0 });
  lines.push({ text: report.targetUrl, size: 12, color: [0.28, 0.33, 0.41], bold: false, gapBefore: 4 });
  lines.push({
    text: `Сгенерирован: ${new Date(report.completedAt).toLocaleString('ru-RU')}`,
    size: 10,
    color: [0.58, 0.62, 0.69],
    bold: false,
    gapBefore: 4,
  });

  // Скоринг
  lines.push({ text: 'Общий скоринг', size: 16, color: [0.04, 0.05, 0.07], bold: true, gapBefore: 16 });
  lines.push({
    text: `Overall: ${report.overallScore}/100`,
    size: 13,
    color: scoreColor(report.overallScore),
    bold: true,
    gapBefore: 6,
  });
  lines.push({
    text: `Technical: ${report.technicalScore}/100   Content: ${report.contentScore}/100`,
    size: 11,
    color: [0.28, 0.33, 0.41],
    bold: false,
    gapBefore: 2,
  });

  // Roadmap
  if (report.roadmap.length > 0) {
    lines.push({
      text: `Топ-${report.roadmap.length} приоритетных правок (Roadmap)`,
      size: 16,
      color: [0.04, 0.05, 0.07],
      bold: true,
      gapBefore: 16,
    });
    for (const item of report.roadmap) {
      lines.push({
        text: `${item.rank}. ${item.title}`,
        size: 12,
        color: [0.04, 0.05, 0.07],
        bold: true,
        gapBefore: 8,
      });
      lines.push({
        text: `Категория: ${item.category === 'technical' ? 'техническая' : 'контентная'} | Impact: ${item.impact}/100 | Effort: ${item.effort}`,
        size: 10,
        color: [0.40, 0.45, 0.52],
        bold: false,
        gapBefore: 2,
      });
      // Описание с переносом по словам
      const desc = escapeText(item.description);
      if (desc) {
        lines.push({
          text: desc.slice(0, 240),
          size: 10,
          color: [0.20, 0.25, 0.33],
          bold: false,
          gapBefore: 2,
        });
      }
    }
  }

  // Технические проблемы
  lines.push({
    text: 'Технические проблемы',
    size: 16,
    color: [0.04, 0.05, 0.07],
    bold: true,
    gapBefore: 16,
  });
  if (report.topIssues.length === 0) {
    lines.push({
      text: 'Критических проблем не найдено.',
      size: 11,
      color: [0.10, 0.64, 0.29],
      bold: false,
      gapBefore: 6,
    });
  } else {
    for (const issue of report.topIssues) {
      lines.push({
        text: `[${issue.severity.toUpperCase()}] ${issue.title}`,
        size: 11,
        color: severityColor(issue.severity),
        bold: true,
        gapBefore: 8,
      });
      lines.push({
        text: escapeText(issue.description).slice(0, 220),
        size: 10,
        color: [0.20, 0.25, 0.33],
        bold: false,
        gapBefore: 2,
        indent: 12,
      });
      if (issue.recommendation) {
        lines.push({
          text: `→ ${escapeText(issue.recommendation).slice(0, 220)}`,
          size: 10,
          color: [0.10, 0.64, 0.29],
          bold: false,
          gapBefore: 2,
          indent: 12,
        });
      }
    }
  }

  // AI-анализ контента
  const page = report.pages[0];
  if (page?.aiAnalysis) {
    lines.push({
      text: 'AI-анализ контента',
      size: 16,
      color: [0.04, 0.05, 0.07],
      bold: true,
      gapBefore: 16,
    });
    lines.push({
      text: `Интент: ${page.aiAnalysis.intent.detected}`,
      size: 11,
      color: [0.28, 0.33, 0.41],
      bold: false,
      gapBefore: 6,
    });
    lines.push({
      text: `Match score: ${page.aiAnalysis.intent.matchScore}%`,
      size: 11,
      color: [0.28, 0.33, 0.41],
      bold: false,
      gapBefore: 2,
    });
    if (page.aiAnalysis.summary) {
      lines.push({
        text: escapeText(page.aiAnalysis.summary).slice(0, 300),
        size: 11,
        color: [0.20, 0.25, 0.33],
        bold: false,
        gapBefore: 6,
      });
    }
    if (page.aiAnalysis.fixes.length > 0) {
      lines.push({
        text: 'Готовые правки:',
        size: 12,
        color: [0.04, 0.05, 0.07],
        bold: true,
        gapBefore: 8,
      });
      for (const fix of page.aiAnalysis.fixes) {
        lines.push({
          text: `• ${fix.title} (impact=${fix.impact}, effort=${fix.effort})`,
          size: 11,
          color: [0.04, 0.05, 0.07],
          bold: true,
          gapBefore: 6,
        });
        if (fix.before) {
          lines.push({
            text: `  Было: ${escapeText(fix.before).slice(0, 200)}`,
            size: 10,
            color: [0.40, 0.45, 0.52],
            bold: false,
            gapBefore: 2,
          });
        }
        if (fix.after) {
          lines.push({
            text: `  Стало: ${escapeText(fix.after).slice(0, 220)}`,
            size: 10,
            color: [0.10, 0.64, 0.29],
            bold: false,
            gapBefore: 2,
          });
        }
        if (fix.rationale) {
          lines.push({
            text: `  ${escapeText(fix.rationale).slice(0, 200)}`,
            size: 10,
            color: [0.20, 0.25, 0.33],
            bold: false,
            gapBefore: 2,
          });
        }
      }
    }
  }

  // Генерация PDF.
  // ВАЖНО: передаём Buffer шрифта в options.font, чтобы pdfkit НЕ пытался
  // грузить дефолтный Helvetica (валится с ENOENT на AFM-файле при bundling).
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `SEO Audit — ${report.targetUrl}`,
      Author: 'Marketing Bureau',
      Subject: 'AI SEO Audit Report',
    },
    font: fonts.regular, // ← дефолтный шрифт = наш TTF с кириллицей
  });

  // Регистрируем bold для использования по имени
  doc.registerFont('DejaVu-Bold', fonts.bold);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginX = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const maxWidth = pageWidth - marginX * 2;
  let y = marginTop;

  const ensureSpace = (lineHeight: number) => {
    if (y + lineHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  for (const line of lines) {
    if (line.gapBefore) y += line.gapBefore;
    // Передаём Buffer напрямую — pdfkit сам кэширует по имени шрифта
    doc.font(line.bold ? fonts.bold : fonts.regular).fontSize(line.size);
    doc.fillColor(line.color);
    const indent = line.indent || 0;
    const x = marginX + indent;
    const text = escapeText(line.text);
    // Перенос по словам — pdfkit умеет сам через doc.text с width
    const textHeight = doc.heightOfString(text, { width: maxWidth - indent });
    ensureSpace(textHeight + 2);
    doc.text(text, x, y, { width: maxWidth - indent });
    y += textHeight + 2;
  }

  doc.end();

  // Собираем буфер
  return Buffer.from(doc.read() as unknown as Uint8Array);
}

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as { report?: AuditReport };
    if (!body.report) {
      return NextResponse.json({ error: 'report is required' }, { status: 400 });
    }

    const fonts = await loadFonts();
    const pdfBuf = buildPdf(body.report, fonts);

    return new NextResponse(pdfBuf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="seo-audit-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'Content-Length': String(pdfBuf.length),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    console.error('[/api/export] error:', msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

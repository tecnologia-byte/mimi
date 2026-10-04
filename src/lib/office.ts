// Browser-only helpers to read and create Word/Excel files. Libraries load on demand.

export async function extractOfficeText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (/\.(xlsx|xls)$/.test(name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return wb.SheetNames.map((s) => `Hoja: ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s]!)}`).join("\n\n");
  }
  return null;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseTables(md: string): string[][][] {
  const tables: string[][][] = [];
  let cur: string[][] = [];
  for (const line of md.split("\n")) {
    const t = line.trim();
    if (t.startsWith("|") && t.endsWith("|")) {
      if (/^\|[\s:|-]+\|$/.test(t)) continue;
      cur.push(t.slice(1, -1).split("|").map((c) => clean(c.trim())));
    } else if (cur.length) {
      tables.push(cur);
      cur = [];
    }
  }
  if (cur.length) tables.push(cur);
  return tables;
}

function clean(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

function asNumber(v: string): string | number {
  const n = Number(v.replace(/[,$\s]/g, "").replace(/^RD/, ""));
  return v !== "" && !Number.isNaN(n) && /\d/.test(v) && !/[a-z]{2,}/i.test(v.replace(/^RD/, "")) ? n : v;
}

export async function exportExcel(md: string, base = "Mimi-IVAD") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const tables = parseTables(md);
  if (tables.length) {
    tables.forEach((rows, i) => {
      const ws = XLSX.utils.aoa_to_sheet(rows.map((r, ri) => (ri === 0 ? r : r.map(asNumber))));
      ws["!cols"] = rows[0]!.map((_, c) => ({ wch: Math.min(50, Math.max(10, ...rows.map((r) => (r[c] ?? "").length + 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, `Tabla ${i + 1}`);
    });
  } else {
    const ws = XLSX.utils.aoa_to_sheet(md.split("\n").filter(Boolean).map((l) => [clean(l.replace(/^[#>\-*\d.\s]+/, ""))]));
    ws["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws, "Contenido");
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${base}.xlsx`);
}

export async function exportWord(md: string, base = "Mimi-IVAD") {
  const d = await import("docx");
  const runs = (text: string) =>
    text.split(/(\*\*.+?\*\*)/g).filter(Boolean).map((p) =>
      p.startsWith("**") ? new d.TextRun({ text: clean(p), bold: true }) : new d.TextRun(clean(p)),
    );
  const children: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (t.startsWith("|")) {
      const block: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) block.push(lines[i++]!);
      i--;
      const rows = parseTables(block.join("\n"))[0] ?? [];
      const cols = rows[0]?.length ?? 1;
      const w = Math.floor(9026 / cols);
      children.push(
        new d.Table({
          width: { size: w * cols, type: d.WidthType.DXA },
          columnWidths: Array(cols).fill(w),
          rows: rows.map((r, ri) =>
            new d.TableRow({
              children: Array.from({ length: cols }, (_, c) =>
                new d.TableCell({
                  width: { size: w, type: d.WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  ...(ri === 0 ? { shading: { fill: "F3E2DA", type: d.ShadingType.CLEAR } } : {}),
                  children: [new d.Paragraph({ children: [new d.TextRun({ text: r[c] ?? "", bold: ri === 0 })] })],
                }),
              ),
            }),
          ),
        }),
      );
      continue;
    }
    if (!t) continue;
    const h = /^(#{1,3})\s+(.*)/.exec(t);
    if (h) {
      const level = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3][h[1]!.length - 1]!;
      children.push(new d.Paragraph({ heading: level, children: [new d.TextRun(clean(h[2]!))] }));
    } else if (/^[-*]\s+/.test(t)) {
      children.push(new d.Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(t.replace(/^[-*]\s+/, "")) }));
    } else if (/^\d+[.)]\s+/.test(t)) {
      children.push(new d.Paragraph({ numbering: { reference: "numbers", level: 0 }, children: runs(t.replace(/^\d+[.)]\s+/, "")) }));
    } else {
      children.push(new d.Paragraph({ spacing: { after: 120 }, children: runs(t) }));
    }
  }
  const doc = new d.Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: d.LevelFormat.BULLET, text: "•", alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: d.LevelFormat.DECIMAL, text: "%1.", alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [
      {
        headers: { default: new d.Header({ children: [new d.Paragraph({ children: [new d.TextRun({ text: "IVAD Home & Goods", bold: true, color: "B07A63" })] })] }) },
        children,
      },
    ],
  });
  download(await d.Packer.toBlob(doc), `${base}.docx`);
}

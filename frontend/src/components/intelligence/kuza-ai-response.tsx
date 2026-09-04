import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const normalized = text.replace(/<br\s*\/?>/gi, "\n");
  const chunks = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return chunks.flatMap((chunk, index) => {
    if (!chunk) return [];
    const key = `${keyPrefix}-${index}`;

    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return [
        <strong className="font-semibold text-slate-950 dark:text-white" key={key}>
          {chunk.slice(2, -2)}
        </strong>,
      ];
    }

    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return [
        <code
          className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          key={key}
        >
          {chunk.slice(1, -1)}
        </code>,
      ];
    }

    const lines = chunk.split("\n");
    return lines.flatMap((line, lineIndex) => [
      lineIndex > 0 ? <br key={`${key}-br-${lineIndex}`} /> : null,
      <Fragment key={`${key}-text-${lineIndex}`}>{line}</Fragment>,
    ]);
  });
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return (
    /^#{1,6}\s+/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    (line.includes("|") && isTableSeparator(next))
  );
}

function KuzaAIResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className =
        level <= 2
          ? "mt-5 first:mt-0 text-base font-bold tracking-tight text-slate-950 dark:text-white"
          : "mt-4 first:mt-0 text-sm font-semibold text-slate-950 dark:text-white";
      blocks.push(
        <h3 className={className} key={`heading-${index}`}>
          {renderInline(heading[2], `heading-${index}`)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(rawLine)) {
      blocks.push(
        <hr className="my-4 border-slate-200 dark:border-slate-800" key={`hr-${index}`} />,
      );
      index += 1;
      continue;
    }

    if (rawLine.includes("|") && isTableSeparator(lines[index + 1] ?? "")) {
      const header = splitTableRow(rawLine);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }
      blocks.push(
        <div
          className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
          key={`table-${index}`}
        >
          <table className="w-full min-w-max border-collapse text-left text-xs leading-5">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {header.map((cell, cellIndex) => (
                  <th
                    className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    key={`table-head-${cellIndex}`}
                    scope="col"
                  >
                    {renderInline(cell, `table-head-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr className="align-top" key={`table-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      className="border-b border-slate-100 px-3 py-2 text-slate-600 last:border-b-0 dark:border-slate-900 dark:text-slate-300"
                      key={`table-cell-${rowIndex}-${cellIndex}`}
                    >
                      {renderInline(cell, `table-cell-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(rawLine)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300" key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>
              {renderInline(item, `ul-item-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(rawLine)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol className="my-3 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300" key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>
              {renderInline(item, `ol-item-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (/^>\s?/.test(rawLine)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote
          className="my-3 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          key={`quote-${index}`}
        >
          {renderInline(quoteLines.join(" "), `quote-${index}`)}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? "").trim() &&
      !isBlockStart(lines, index)
    ) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }
    blocks.push(
      <p className="my-3 text-sm leading-6 text-slate-700 first:mt-0 last:mb-0 dark:text-slate-300" key={`p-${index}`}>
        {renderInline(paragraph.join(" "), `p-${index}`)}
      </p>,
    );
  }

  return <div className="min-w-0">{blocks}</div>;
}

export { KuzaAIResponse };

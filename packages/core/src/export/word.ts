import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx';
import { Lexer, type Token, type Tokens } from 'marked';

/** What a deliverable says about itself in its document-control table, taken from the Markdown front matter. */
export interface DeliverableMeta {
  document: string;
  project: string;
  version?: string;
  status?: string;
  owner?: string;
  writtenBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  template?: string;
}

export interface WordOptions {
  /** `word/styles.xml` from the organisation's Word template. Its fonts, colours and heading styles replace the defaults. */
  styles?: string;
}

const FONT = 'Calibri';
const INK = '1F2937';
const MUTED = '6B7280';
const ACCENT = '1F3864';
const RULE = 'C7CED8';
const HEAD_FILL = 'E8EEF5';

type Inline = { bold?: boolean; italics?: boolean; code?: boolean; strike?: boolean };

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s: string) => s.replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);

function textRun(text: string, f: Inline, link = false): TextRun {
  return new TextRun({
    text: decode(text),
    bold: f.bold,
    italics: f.italics,
    strike: f.strike,
    font: f.code ? 'Consolas' : undefined,
    size: f.code ? 19 : undefined,
    color: link ? '1D4ED8' : undefined,
    underline: link ? {} : undefined,
  });
}

/** Markdown inline tokens (bold, italics, code, links, line breaks) as Word runs. */
function inline(tokens: Token[] | undefined, f: Inline = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'strong':
        out.push(...inline((t as Tokens.Strong).tokens, { ...f, bold: true }));
        break;
      case 'em':
        out.push(...inline((t as Tokens.Em).tokens, { ...f, italics: true }));
        break;
      case 'del':
        out.push(...inline((t as Tokens.Del).tokens, { ...f, strike: true }));
        break;
      case 'codespan':
        out.push(textRun((t as Tokens.Codespan).text, { ...f, code: true }));
        break;
      case 'br':
        out.push(new TextRun({ break: 1 }));
        break;
      case 'link': {
        const l = t as Tokens.Link;
        const text = (l.tokens?.length ? plain(l.tokens) : l.text) || l.href;
        out.push(/^https?:/i.test(l.href) ? new ExternalHyperlink({ link: l.href, children: [textRun(text, f, true)] }) : textRun(text, f));
        break;
      }
      case 'text': {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) out.push(...inline(tt.tokens, f));
        else out.push(textRun(tt.text, f));
        break;
      }
      case 'escape':
        out.push(textRun((t as Tokens.Escape).text, f));
        break;
      case 'html':
        break; // comments and stray tags in a draft are not content
      default:
        if ('text' in t && typeof t.text === 'string') out.push(textRun(t.text, f));
    }
  }
  return out;
}

/** The plain text of inline tokens. */
export function plain(tokens: Token[]): string {
  return decode(tokens.map((t) => ('tokens' in t && Array.isArray(t.tokens) ? plain(t.tokens) : 'text' in t ? String(t.text) : '')).join(''));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const tableBorders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const cellMargins = { top: 70, bottom: 70, left: 110, right: 110 };

function cell(children: Paragraph[], header: boolean, widthPct?: number): TableCell {
  return new TableCell({
    children,
    margins: cellMargins,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: HEAD_FILL } : undefined,
  });
}

const para = (tokens: Token[], f: Inline = {}) => new Paragraph({ children: inline(tokens, f), spacing: { before: 0, after: 0 } });

function table(t: Tokens.Table): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, children: t.header.map((h) => cell([para(h.tokens, { bold: true })], true)) }),
      ...t.rows.map((r) => new TableRow({ children: r.map((c) => cell([para(c.tokens)], false)) })),
    ],
  });
}

/** Turns Markdown blocks into Word paragraphs and tables. H1 is the title; H2 and below become Heading 1 and below. */
class Blocks {
  out: (Paragraph | Table)[] = [];
  private listInstance = 0;

  add(tokens: Token[]): void {
    for (const t of tokens) this.block(t);
  }

  private block(t: Token): void {
    switch (t.type) {
      case 'heading': {
        const h = t as Tokens.Heading;
        if (h.depth === 1) return; // the title opens the document
        const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][Math.min(h.depth - 2, 3)];
        this.out.push(new Paragraph({ heading: level, children: inline(h.tokens) }));
        return;
      }
      case 'paragraph':
        this.out.push(new Paragraph({ children: inline((t as Tokens.Paragraph).tokens) }));
        return;
      case 'list':
        this.list(t as Tokens.List, 0);
        return;
      case 'table':
        this.out.push(table(t as Tokens.Table), new Paragraph({ children: [], spacing: { after: 60 } }));
        return;
      case 'code':
        for (const line of (t as Tokens.Code).text.split('\n')) {
          this.out.push(new Paragraph({ children: [textRun(line || ' ', { code: true })], spacing: { before: 0, after: 0 }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F4F6' } }));
        }
        this.out.push(new Paragraph({ children: [] }));
        return;
      case 'blockquote':
        for (const inner of (t as Tokens.Blockquote).tokens) {
          if (inner.type === 'paragraph') this.out.push(new Paragraph({ children: inline((inner as Tokens.Paragraph).tokens, { italics: true }), indent: { left: 400 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: RULE, space: 8 } } }));
          else this.block(inner);
        }
        return;
      case 'hr':
        this.out.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 1 } } }));
        return;
      default:
        return; // spaces and HTML comments
    }
  }

  private list(l: Tokens.List, level: number): void {
    const instance = l.ordered ? ++this.listInstance : 0;
    for (const item of l.items) {
      let first = true;
      for (const t of item.tokens) {
        if (t.type === 'list') {
          this.list(t as Tokens.List, level + 1);
          continue;
        }
        const tokens = t.type === 'text' || t.type === 'paragraph' ? ((t as Tokens.Text).tokens ?? [t]) : [t];
        const children = inline(tokens);
        const lvl = Math.min(level, 2);
        if (first) {
          this.out.push(new Paragraph({ children, ...(l.ordered ? { numbering: { reference: 'ordered', level: lvl, instance } } : { bullet: { level: lvl } }), spacing: { before: 0, after: 60 } }));
          first = false;
        } else {
          this.out.push(new Paragraph({ children, indent: { left: 720 * (level + 1) }, spacing: { before: 0, after: 60 } }));
        }
      }
    }
  }
}

export function formatWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const capital = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** The rows of the document-control table, shared by Word and Excel deliverables. */
export function controlRows(meta: DeliverableMeta): [string, string][] {
  const rows: [string, string][] = [
    ['Document', meta.document],
    ['Project', meta.project],
    ['Version', meta.version ?? ''],
    ['Status', capital(meta.status)],
    ['Owner', meta.owner ?? ''],
    ['Approved by', meta.approvedBy ?? 'Not approved yet'],
    ['Approved on', formatWhen(meta.approvedAt)],
    ['Written by', meta.writtenBy ?? ''],
    ['Template', meta.template ?? ''],
  ];
  return rows.filter(([, v]) => v);
}

function controlTable(meta: DeliverableMeta): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: controlRows(meta).map(
      ([k, v]) =>
        new TableRow({
          children: [
            cell([new Paragraph({ children: [new TextRun({ text: k, bold: true })], spacing: { before: 0, after: 0 } })], true, 28),
            cell([new Paragraph({ children: [new TextRun({ text: v })], spacing: { before: 0, after: 0 } })], false, 72),
          ],
        }),
    ),
  });
}

const DEFAULT_STYLES = {
  default: { document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { after: 120, line: 276 } } } },
  paragraphStyles: [
    { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, color: ACCENT }, paragraph: { spacing: { after: 80 } } },
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: ACCENT }, paragraph: { spacing: { before: 360, after: 120 }, keepNext: true } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: ACCENT }, paragraph: { spacing: { before: 260, after: 100 }, keepNext: true } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true } },
    { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, italics: true, color: INK }, paragraph: { spacing: { before: 160, after: 60 }, keepNext: true } },
  ],
};

const ORDERED = {
  config: [
    {
      reference: 'ordered',
      levels: [0, 1, 2].map((level) => ({
        level,
        format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][level],
        text: `%${level + 1}.`,
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
      })),
    },
  ],
};

/** One approved deliverable as a Word file: a document-control table, then the content with real headings, lists and tables. */
export async function markdownToWord(markdown: string, meta: DeliverableMeta, opts: WordOptions = {}): Promise<Buffer> {
  const tokens = new Lexer().lex(markdown);
  const titleToken = tokens.find((t) => t.type === 'heading' && (t as Tokens.Heading).depth === 1) as Tokens.Heading | undefined;
  const title = titleToken ? plain(titleToken.tokens) : `${meta.document}: ${meta.project}`;
  // Wide tables read better across a landscape page.
  const wide = tokens.some((t) => t.type === 'table' && (t as Tokens.Table).header.length >= 6);

  const body = new Blocks();
  body.add(tokens);

  const muted = (text: string) => new TextRun({ text, size: 17, color: MUTED });
  const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [muted(`${meta.project} · ${meta.document}`)] })] });
  const footerBits = [meta.version ? `Version ${meta.version}` : '', capital(meta.status)].filter(Boolean).join(' · ');
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [muted(footerBits ? `${footerBits} · Page ` : 'Page '), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: MUTED }), muted(' of '), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: MUTED })],
      }),
    ],
  });

  const doc = new Document({
    creator: 'SDLC CAPM',
    title,
    description: `${meta.document} for ${meta.project}`,
    ...(opts.styles ? { externalStyles: opts.styles } : { styles: DEFAULT_STYLES }),
    numbering: ORDERED,
    sections: [
      {
        properties: { page: { size: { orientation: wide ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        headers: { default: header },
        footers: { default: footer },
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
          new Paragraph({ children: [new TextRun({ text: 'Document control', bold: true, color: ACCENT })], spacing: { before: 120, after: 80 } }),
          controlTable(meta),
          new Paragraph({ children: [], spacing: { after: 120 } }),
          ...body.out,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

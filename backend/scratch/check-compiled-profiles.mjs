import zlib from "zlib";
import { PDFDocument } from "pdf-lib";
import { generateCompiledProfilesPdf } from "../utils/inventory-pdf.js";

const make = (surname, first) => ({
  formData: {
    personal: { nameSurname: surname, nameFirst: first, course: "BS Psychology", yearLevel: "2" },
  },
  profile: { name: `${first} ${surname}`, studentNumber: "2026-0001", email: "s@example.com" },
  signatures: {},
});

const bytes = await generateCompiledProfilesPdf([
  make("Gampong", "Abdul Malik"),
  make("Cruz", "Abdensa"),
]);
const pdf = await PDFDocument.load(bytes);

// pdf-lib writes text in a CID font (hex strings), so compare streams instead
// of searching for the name: each student must get its own drawn content.
const stream = (page) =>
  page.node
    .Contents()
    .asArray()
    .map((r) => {
      const raw = Buffer.from(pdf.context.lookup(r).getContents());
      return (raw[0] === 0x78 ? zlib.inflateSync(raw) : raw).toString("latin1");
    })
    .join("");

const [p1, p2, p3, p4] = pdf.getPages();
if (pdf.getPageCount() !== 4) throw new Error("expected 4 pages");
if (stream(p1) === stream(p3)) throw new Error("students share a content stream");
if (!stream(p1).includes("Tj") || !stream(p3).includes("Tj")) throw new Error("no text drawn");
if (stream(p2) === stream(p4)) throw new Error("page 2s share a content stream");
if (bytes.length > 2 * 1024 * 1024) throw new Error("merged file is unexpectedly large");
console.log(`ok: 4 pages, own content per student, ${(bytes.length / 1024).toFixed(0)} KB`);

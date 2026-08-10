import fs from "fs";
import path from "path";
import PizZip from "pizzip";

const TEMPLATE_PATH = path.join("templates", "source", "individual-inventory-source.docx");
const content = fs.readFileSync(TEMPLATE_PATH, "binary");
const zip = new PizZip(content);
const xml = zip.file("word/document.xml").asText();

const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
let tMatch;
let wtIndex = 0;
while ((tMatch = textRegex.exec(xml)) !== null) {
  const text = tMatch[1];
  if (text.toLowerCase().includes("1x1") || text.toLowerCase().includes("picture") || text.toLowerCase().includes("photo")) {
    console.log(`Node index ${wtIndex}: "${text}"`);
    // Find the enclosing paragraph or table cell
    const startIdx = Math.max(0, tMatch.index - 500);
    const endIdx = Math.min(xml.length, tMatch.index + tMatch[0].length + 500);
    console.log("Context:");
    console.log(xml.substring(startIdx, endIdx));
    console.log("=========================================\n");
  }
  wtIndex++;
}

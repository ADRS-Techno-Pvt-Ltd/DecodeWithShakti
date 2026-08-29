import { PDFDocument, PDFRawStream } from "pdf-lib";
import { readFile } from "fs/promises";
import { inflateSync } from "zlib";

async function main(fileName: string) {
  const bytes = await readFile(fileName);
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const contents = page.node.normalizedEntries().Contents;
  if (!contents) {
    console.log("no contents");
    return;
  }
  console.log(fileName, "num content streams:", contents.size());
  let totalDrawImage = 0;
  let totalDrawText = 0;
  for (let i = 0; i < contents.size(); i++) {
    const stream = doc.context.lookup(contents.get(i));
    if (!(stream instanceof PDFRawStream)) continue;
    let text: string;
    try {
      text = inflateSync(Buffer.from(stream.getContents())).toString("latin1");
    } catch {
      text = Buffer.from(stream.getContents()).toString("latin1");
    }
    const doCount = (text.match(/ Do\b/g) ?? []).length;
    const tjCount = (text.match(/Tj/g) ?? []).length;
    totalDrawImage += doCount;
    totalDrawText += tjCount;
    if (doCount || tjCount) {
      console.log(`  stream ${i}: len=${text.length} Do=${doCount} Tj=${tjCount}`);
    }
  }
  console.log("TOTAL Do (image draws):", totalDrawImage, "TOTAL Tj (text draws):", totalDrawText);
}

main(process.argv[2]).catch((e) => {
  console.error(e);
  process.exit(1);
});

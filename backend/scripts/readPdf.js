const PDFParser = require('pdf2json');
const path = require('path');

const filePath = process.argv[2];

const parser = new PDFParser();
parser.on('pdfParser_dataReady', (data) => {
  const text = data.Pages.map(page =>
    page.Texts.map(t => decodeURIComponent(t.R.map(r => r.T).join(''))).join(' ')
  ).join('\n');
  process.stdout.write(text);
});
parser.on('pdfParser_dataError', e => console.error(e));
parser.loadPDF(path.resolve(filePath));

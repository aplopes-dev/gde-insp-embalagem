import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';

const styleClasses = `<style>
@font-face {
  font-family: 'LibreBarcode39-Regular';
  src: url("./fonts/LibreBarcode39-Regular.ttf");
  font-style: normal;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  width: 100mm;
  height: 80mm;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.tag-area {
  padding: 8px;
  width: 100mm;
  height: 80mm;
  background-color: white;
  color: #000;
  font-size: 9px;
  box-sizing: border-box;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #000;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
  border-bottom: 1px solid #000;
  padding-bottom: 3px;
}

.logo-area {
  width: 30mm;
  height: 10mm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gde-name {
  width: 55mm;
  height: 10mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 9px;
  border-right: 1px solid #000;
  border-left: 1px solid #000;
}

.pgqf {
  font-weight: bold;
  font-size: 9px;
  padding-right: 5px;

}

.process-title {
  font-size: 9px;
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid black;
  padding-bottom: 2px;
  margin-bottom: 3px;
}

.info-section {
  margin-bottom: 5px;
}

.info-row {
  display: flex;
  margin-bottom: 3px;
  padding-bottom: 3px;
  border-bottom: 1px solid #000;
}

.info-label {
  font-weight: bold;
  font-size: 9px;
 
}

.info-value {
  flex: 1;
  padding-left: 1.5em;
  font-size: 9px;
}

.info-col {
  display: flex;
  flex: 1;
  border-right: 1px solid #ddd;
}

.info-col:last-child {
  border-right: none;
}

.title {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 12px;
  margin-top: 3px;
  padding: 2px;
}

.description {
  font-size: 9px;
  margin-bottom: 3px;
  padding: 2px;
}

.barcode-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.barcode-container {
  flex: 2;
}

.lot-quantity-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 5px;
  border-left: 1px solid #ddd;
  padding-left: 5px;
  flex: 1;
}

.batch {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 9px;
  white-space: nowrap;
}

.quantity {
  margin-top: 3px;
  text-transform: uppercase;
  white-space: nowrap;
  font-size: 9px;
  font-weight: bold;
}

.no-warp-line {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>`

export async function POST(request: Request) {
  const data = await request.json();
  const { conteudo } = data;
  console.log(conteudo);

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(styleClasses + conteudo, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(process.cwd(), 'printing_file.pdf');
    await page.pdf({
      path: pdfPath,
      width: '100mm',
      height: '80mm',
      printBackground: false,
      pageRanges: "1"
    });

    await browser.close();

    try {
      exec(`lp "${pdfPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('Erro ao enviar o PDF para o CUPS:', error);
          return NextResponse.json({ message: 'Erro ao imprimir o arquivo PDF.' }, { status: 500 });
        }
        if (stderr) {
          console.error('Erro do CUPS:', stderr);
          return NextResponse.json({ message: 'Erro na impressão pelo CUPS.' }, { status: 500 });
        }
        console.log('Job de impressão enviado com sucesso:', stdout);
        setTimeout(() => {
          fs.unlinkSync(pdfPath);
        }, 5000)
      });
    } catch (error) {
      console.error('Erro no servidor:', error);
      return NextResponse.json({ message: 'Erro no servidor:' + error }, { status: 500 });
    }
    return NextResponse.json({ message: 'Impressão iniciada com sucesso' });
  } catch (erro) {
    console.error('Erro ao imprimir:', erro);
    return NextResponse.json({ error: 'Erro ao imprimir' }, { status: 500 });
  }
}

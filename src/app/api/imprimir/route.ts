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

body{
  font-family: Arial, Helvetica, sans-serif;
  width: 100mm;
  height: 50mm;
  box-sizing: border-box;
  margin:0;
  padding:0;
}

.tag-area {
  padding: 5mm 10mm;
  width: 100mm;
  height: 50mm;
  background-color: white;
  color: #000;
  font-size: 32px;
  gap: 3px;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  flex-direction: column;
}

.title {
  text-transform: uppercase;
  font-weight: bold;
}

.description {
  font-size: 18px;
}

.batch {
  text-transform: uppercase;
  font-weight: bold;
}

.barcode-row {
  display: flex;
  margin-top: 10px;
}

.barcode {
  font-size: 48px;
  flex: auto;
  text-align: center;
  font-family: 'Libre Barcode 39';
}

.quantity {
  width: 50%;
  margin-top: 5px;
  text-transform: uppercase;
  font-size: 18px;
  font-weight: bold;
}
</style>`

export async function POST(request: Request) {
  const data = await request.json();
  const { conteudo } = data;

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(styleClasses + conteudo, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(process.cwd(), 'printing_file.pdf');
    await page.pdf({
      path: pdfPath,
      width: '100mm', // 101,6 mm em pontos
      height: '50mm', // 152,4 mm em pontos
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

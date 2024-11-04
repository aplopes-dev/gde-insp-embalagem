import { exec } from 'child_process';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import puppeteer from 'puppeteer';


const styleClasses = `<style>
@import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');

body{
  font-family: Arial, Helvetica, sans-serif;
  width: 5cm;
  height: 2.5cm;
}

.tag-area {
  padding: 3px;
  width: 5cm;
  height: 2.5cm;
  background-color: white;
  color: #000;
  font-size: 9px;
  gap: 5px;
  display: flex;
  flex-direction: column;
}

.title {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 10px;
}

.description {
  font-size: 6px;
}

.batch {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 10px;
}

.barcode-row {
  display: flex;
}

.barcode {
  font-family: "Libre Barcode 39", system-ui;
  font-size: 20px;
  flex: auto;
  text-align: center;
}

.quantity {
  width: 50%;
  text-transform: uppercase;
  font-size: 7.5px;
  font-weight: bold;
}
</style>`

export async function POST(request: Request) {
  const data = await request.json();
  const { conteudo } = data;
  console.log(conteudo);

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.addStyleTag
    await page.setContent(styleClasses + conteudo, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(process.cwd(), 'printing_file.pdf');
    await page.pdf({
      path: pdfPath,
      width: '288px', // 101,6 mm em pontos
      height: '432px', // 152,4 mm em pontos
      printBackground: true
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

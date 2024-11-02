import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { print } from 'pdf-to-printer';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const data = await request.json();
  const { conteudo } = data;
  console.log(conteudo);

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(conteudo, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(process.cwd(), 'etiqueta2.pdf');
    await page.pdf({
      path: pdfPath,
      width: '288px', // 101,6 mm em pontos
      height: '432px', // 152,4 mm em pontos
      printBackground: true
    });

    await browser.close();

    await print(pdfPath);
    console.log(page);
    console.log(pdfPath);

    //fs.unlinkSync(pdfPath);

    return NextResponse.json({ message: 'Impressão iniciada' });
  } catch (erro) {
    console.error('Erro ao imprimir:', erro);
    return NextResponse.json({ error: 'Erro ao imprimir' }, { status: 500 });
  }
}

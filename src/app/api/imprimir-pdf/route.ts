import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  const { pdfBase64 } = await request.json();

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfPath = path.join(process.cwd(), 'printing_file.pdf');
    
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Opções para evitar scaling e manter tamanho original
    const printOptions = [
      '-o fit-to-page=false',           // Não ajustar ao tamanho da página
      '-o scaling=100',                 // Scaling 100% (sem redimensionamento)
      '-o print-scaling=none',          // Sem scaling adicional
      '-o natural-scaling=100'          // Scaling natural 100%
    ];

    // Comando alternativo mais específico
    const printCommand = `lp ${printOptions.join(' ')} "${pdfPath}"`;

    // Comando alternativo com lpr (caso lp não funcione)
    // const printCommand = `lpr -o fit-to-page=false -o scaling=100 "${pdfPath}"`;

    console.log('Comando de impressão:', printCommand);

    exec(printCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro ao enviar o PDF para o CUPS:', error);
        return NextResponse.json({ message: 'Erro ao imprimir o arquivo PDF.' }, { status: 500 });
      }
      console.log('Job de impressão enviado com sucesso:', stdout);
      setTimeout(() => {
        fs.unlinkSync(pdfPath);
      }, 5000);
    });

    return NextResponse.json({ message: 'PDF enviado para impressão com sucesso' });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json({ message: 'Erro no servidor: ' + error }, { status: 500 });
  }
}
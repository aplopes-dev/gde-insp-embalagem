import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import http from 'http';

// Função para baixar a imagem e salvá-la localmente
async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Determinar se é uma URL http ou https
    const client = url.startsWith('https') ? https : http;
    
    // Se for um caminho local, copiar o arquivo
    if (url.startsWith('/')) {
      try {
        const localPath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(localPath)) {
          fs.copyFileSync(localPath, outputPath);
          return resolve(true);
        } else {
          console.error(`Arquivo local não encontrado: ${localPath}`);
          return resolve(false);
        }
      } catch (error) {
        console.error(`Erro ao copiar arquivo local: ${error}`);
        return resolve(false);
      }
    }
    
    // Se for uma URL externa, baixar
    const request = client.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.error(`Falha ao baixar imagem. Status: ${response.statusCode}`);
        return resolve(false);
      }
      
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
    });
    
    request.on('error', (err) => {
      console.error(`Erro ao baixar imagem: ${err.message}`);
      resolve(false);
    });
    
    // Definir timeout
    request.setTimeout(10000, () => {
      request.destroy();
      console.error('Timeout ao baixar imagem');
      resolve(false);
    });
  });
}

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
  padding: 8px 8px 0;
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
  border-bottom: 1px solid #000;
  padding-top: 4px;
}

.logo-area {
  width: 30mm;
  height: 10mm;
  display: flex;
  justify-content: center;
  align-items: center;
}

.company-logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.gde-name {
  width: 55mm;
  height: 10mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-right: 1px solid #000;
  border-left: 1px solid #000;
}

.logo {
  font-weight: bold;
}

.pgqf {
  font-weight: bold;
  padding-right: 5px;
}

.process-title {
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid black;
  padding-bottom: 5px;
  padding-top: 5px;
  margin-bottom: 3px;
}

.info-section {
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-row {
  display: flex;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid #000;
}

.info-label {
  font-weight: bold;
}

.info-value {
  padding-left: 0.5em;
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
  display: flex;
  align-items: center;
}

.barcode-container {
  flex: 2;
}

.lot-quantity-info {
  display: flex;
  flex-direction: column;
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

.section-qrcode {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
}



.qrcode-area {
  width: 05mm;
  height: 05mm;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  margin-left: auto;
}

.product-qrcode-section {
  display: flex;
  justify-content: space-between;
}

.qrcode-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>`

export async function POST(request: Request) {
  const data = await request.json();
  let { conteudo } = data;
  console.log(conteudo);

  try {
    // Extrair a URL da logo do conteúdo HTML
    const logoUrlMatch = conteudo.match(/src="([^"]+)"/);
    let logoUrl = logoUrlMatch ? logoUrlMatch[1] : null;
    let logoPath = '';
    
    // Se encontrou uma URL de logo, baixá-la
    if (logoUrl) {
      logoPath = path.join(process.cwd(), 'temp_logo.png');
      const downloaded = await downloadImage(logoUrl, logoPath);
      
      if (downloaded) {
        // Substituir a URL da imagem no HTML pelo caminho local
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        const dataUrl = `data:image/png;base64,${logoBase64}`;
        conteudo = conteudo.replace(logoUrl, dataUrl);
      } else {
        console.error('Não foi possível baixar a logo');
      }
    }

    // Iniciar o Puppeteer
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-web-security'] 
    });
    const page = await browser.newPage();
    
    // Desativar a política de segurança de conteúdo
    await page.setBypassCSP(true);
    
    // Configurar o conteúdo da página
    await page.setContent(styleClasses + conteudo, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Aguardar um pouco para garantir que as imagens sejam carregadas
    await page.setDefaultTimeout(1000);

    const pdfPath = path.join(process.cwd(), 'printing_file.pdf');
    await page.pdf({
      path: pdfPath,
      width: '100mm',
      height: '80mm',
      printBackground: true,
      pageRanges: "1"
    });

    await browser.close();
    
    // Limpar o arquivo temporário da logo
    if (logoPath && fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

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

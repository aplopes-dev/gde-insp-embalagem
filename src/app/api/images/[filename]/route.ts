import fs from 'fs';
import path from 'path';

const IMAGE_DIRECTORY = `${process.env.IMAGES_DIR}`; // Diretório externo

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  
  const reqUrl = req.url
  const { searchParams } = new URL(reqUrl)

  const resourcePath = searchParams.get('path') 

  if(!resourcePath){
    throw Error("'path' param is required")
  }

  const pathArr = resourcePath.split("/")
  const filePath = path.join(IMAGE_DIRECTORY, ...pathArr, filename);
  
  console.log("filePath");
  console.log(filePath);

  console.log("exists");
  console.log(fs.existsSync(filePath));

  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 });
  }

  const file = fs.readFileSync(filePath);
  const mimeType = 'image/' + path.extname(filename).substring(1); // Detecta o tipo de imagem

  return new Response(file, {
    headers: { 'Content-Type': mimeType },
  });
}

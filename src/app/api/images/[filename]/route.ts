import fs from "fs";
import path from "path";
import { fetchLogImageFromMinio } from "@/shared/services/minio-logs";

const IMAGE_DIRECTORY = process.env.IMAGES_DIR ?? "";

export async function GET(
  req: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  const { searchParams } = new URL(req.url);
  const resourcePath = searchParams.get("path");

  if (!resourcePath) {
    return new Response("'path' param is required", { status: 400 });
  }

  const pathArr = resourcePath.split("/").filter(Boolean);
  const filePath = IMAGE_DIRECTORY
    ? path.join(IMAGE_DIRECTORY, ...pathArr, filename)
    : "";

  if (filePath && fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath);
    const mimeType = "image/" + path.extname(filename).substring(1);
    return new Response(file, {
      headers: { "Content-Type": mimeType },
    });
  }

  const fromMinio = await fetchLogImageFromMinio(resourcePath, filename);
  if (fromMinio) {
    const mimeType = "image/" + path.extname(filename).substring(1);
    return new Response(fromMinio, {
      headers: { "Content-Type": mimeType },
    });
  }

  return new Response("File not found", { status: 404 });
}

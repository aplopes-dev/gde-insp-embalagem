import fs from "fs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { fetchLogImageFromMinio } from "@/shared/services/minio-logs";
import {
  resolvePathInsideRoot,
  sanitizeImageLocation,
} from "@/lib/image-path-safety";

const IMAGE_DIRECTORY = process.env.IMAGES_DIR ?? "";

export async function GET(
  req: Request,
  { params }: { params: { filename: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { filename } = params;
  const { searchParams } = new URL(req.url);
  const resourcePath = searchParams.get("path");

  if (!resourcePath) {
    return new Response("'path' param is required", { status: 400 });
  }

  const safe = sanitizeImageLocation(resourcePath, filename);
  if (!safe) {
    return new Response("Invalid path", { status: 400 });
  }

  const filePath = IMAGE_DIRECTORY
    ? resolvePathInsideRoot(
        IMAGE_DIRECTORY,
        safe.pathSegments,
        safe.filename
      )
    : null;

  if (filePath && fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath);
    const mimeType = "image/" + safe.filename.split(".").pop();
    return new Response(file, {
      headers: { "Content-Type": mimeType || "application/octet-stream" },
    });
  }

  const fromMinio = await fetchLogImageFromMinio(
    safe.pathSegments.join("/"),
    safe.filename
  );
  if (fromMinio) {
    const mimeType = "image/" + safe.filename.split(".").pop();
    return new Response(fromMinio, {
      headers: { "Content-Type": mimeType || "application/octet-stream" },
    });
  }

  return new Response("File not found", { status: 404 });
}

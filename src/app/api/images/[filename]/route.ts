import fs from "fs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { fetchLogImageFromMinio } from "@/shared/services/minio-logs";
import { logImageDatePathCandidates } from "@/lib/log-image-date";
import {
  resolvePathInsideRoot,
  sanitizeImageLocation,
} from "@/lib/image-path-safety";

const IMAGE_DIRECTORY = process.env.IMAGES_DIR ?? "";

async function loadImageBytes(
  pathSegments: string[],
  filename: string
): Promise<Buffer | null> {
  const filePath = IMAGE_DIRECTORY
    ? resolvePathInsideRoot(IMAGE_DIRECTORY, pathSegments, filename)
    : null;

  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  return fetchLogImageFromMinio(pathSegments.join("/"), filename);
}

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

  // Path principal + ±1 dia (embalagens noturnas: UI UTC vs pasta local do worker).
  const primary =
    safe.pathSegments.length === 1 ? safe.pathSegments[0] : null;
  const candidates =
    primary && /^\d{4}-\d{2}-\d{2}$/.test(primary)
      ? logImageDatePathCandidates(primary)
      : [safe.pathSegments.join("/")];

  for (const datePath of candidates) {
    const segments = datePath.split("/").filter(Boolean);
    const candidate = sanitizeImageLocation(segments.join("/"), safe.filename);
    if (!candidate) continue;

    const bytes = await loadImageBytes(
      candidate.pathSegments,
      candidate.filename
    );
    if (bytes) {
      const mimeType = "image/" + candidate.filename.split(".").pop();
      return new Response(bytes, {
        headers: { "Content-Type": mimeType || "application/octet-stream" },
      });
    }
  }

  return new Response("File not found", { status: 404 });
}

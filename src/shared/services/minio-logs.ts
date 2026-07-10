import { Client } from "minio";

let client: Client | null = null;

function minioEnabled(): boolean {
  return Boolean(process.env.MINIO_ENDPOINT?.trim());
}

function getClient(): Client {
  if (!client) {
    const endpoint = process.env.MINIO_ENDPOINT!.trim();
    const [host, portStr] = endpoint.includes(":")
      ? endpoint.split(":")
      : [endpoint, "9000"];
    const port = Number(portStr) || 9000;
    const accessKey =
      process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "gdeadmin";
    const secretKey =
      process.env.MINIO_SECRET_KEY ||
      process.env.MINIO_ROOT_PASSWORD ||
      "gdeadmin123";
    const secure = process.env.MINIO_SECURE === "1";

    client = new Client({
      endPoint: host,
      port,
      useSSL: secure,
      accessKey,
      secretKey,
    });
  }
  return client;
}

function logsBucket(): string {
  return process.env.MINIO_LOGS_BUCKET?.trim() || "gde-log-images";
}

/** Chave no bucket: `YYYY-MM-DD/nome.jpg` (igual ao worker Python). */
export function objectKeyForImage(datePath: string, filename: string): string {
  const parts = datePath.split("/").filter(Boolean);
  return [...parts, filename].join("/");
}

export async function fetchLogImageFromMinio(
  datePath: string,
  filename: string
): Promise<Buffer | null> {
  if (!minioEnabled()) {
    return null;
  }

  const key = objectKeyForImage(datePath, filename);
  try {
    const stream = await getClient().getObject(logsBucket(), key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

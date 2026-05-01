import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

/** Nome do trabalho nas filas/notificações CUPS (IPP «job-name»); evita o basename tipo `printing_file.pdf` ou ruído em testes. */
function cupsJobTitle(raw?: string | null): string {
  const cleaned = (raw ?? "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 127);
  return cleaned || "Etiqueta GDE";
}

/**
 * Envia PDF ao CUPS via `lp` no mesmo ambiente onde corre o Next.js.
 *
 * **Docker (rede bridge):** montar só `cups.sock` costuma falhar (“Scheduler is not running”).
 * Use IPP TCP no host com **`CUPS_LP_SERVER=<gateway-compose>:631/version=1.1`** (CUPS a ouvir em
 * `0.0.0.0:631`). O gateway da rede do projeto costuma funcionar melhor que só `host.docker.internal`
 * (muitas vezes docker0 / 172.17.x). Em máquina sem Docker, omita `CUPS_LP_SERVER` para usar o socket local.
 *
 * Com `-h` remoto, o servidor muitas vezes não expõe destino padrão ao cliente — use
 * **`CUPS_LP_DESTINATION`** ou o campo JSON opcional **`destination`** (nome da fila CUPS).
 *
 * **`jobTitle`** no JSON ou **`CUPS_LP_JOB_TITLE`** define o nome do trabalho (`lp -t`), visível nas
 * notificações do ambiente (evita confusão com nomes de ficheiros de teste, ex. `hosts`).
 */
export async function POST(request: Request) {
  let pdfPath: string | null = null;
  try {
    const body = await request.json();
    const pdfBase64 = body?.pdfBase64;
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json(
        { message: "Campo pdfBase64 em falta ou inválido." },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    pdfPath = path.join(process.cwd(), "printing_file.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);

    const cupsServer = process.env.CUPS_LP_SERVER?.trim();
    const destFromBody =
      typeof body?.destination === "string" ? body.destination.trim() : "";
    const destination =
      destFromBody || process.env.CUPS_LP_DESTINATION?.trim() || "";

    const titleFromBody =
      typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
    const jobTitle = cupsJobTitle(
      titleFromBody || process.env.CUPS_LP_JOB_TITLE?.trim()
    );

    const lpArgs: string[] = [];
    if (cupsServer) {
      lpArgs.push("-h", cupsServer);
    }
    if (destination) {
      lpArgs.push("-d", destination);
    }
    lpArgs.push("-t", jobTitle);
    lpArgs.push(
      "-o",
      "fit-to-page=false",
      "-o",
      "scaling=100",
      "-o",
      "print-scaling=none",
      "-o",
      "natural-scaling=100",
      pdfPath
    );

    console.log("[imprimir-pdf] lp", lpArgs.join(" "));

    const { stdout, stderr } = await execFileAsync("lp", lpArgs, {
      maxBuffer: 1024 * 1024,
    });

    if (stderr && stderr.trim()) {
      console.warn("[imprimir-pdf] stderr:", stderr);
    }
    console.log("[imprimir-pdf] stdout:", stdout);

    setTimeout(() => {
      try {
        if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch {
        /* ignore */
      }
    }, 5000);

    return NextResponse.json({
      message: "PDF enviado para impressão com sucesso",
      stdout: stdout?.trim(),
    });
  } catch (error: unknown) {
    console.error("[imprimir-pdf] Erro:", error);
    try {
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } catch {
      /* ignore */
    }
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message:
          "Falha ao imprimir — confira `CUPS_LP_SERVER`, `CUPS_LP_DESTINATION` ou `destination` no JSON, e CUPS no host (porta 631).",
        detail: msg,
      },
      { status: 500 }
    );
  }
}

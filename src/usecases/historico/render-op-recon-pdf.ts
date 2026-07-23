import puppeteer from "puppeteer";
import { HistoricoOpReconReport } from "@/types/dtos/historico-op-recon-dto";

function esc(value: string | number | null | undefined): string {
  if (value == null) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function boolLabel(value: boolean | null | undefined): string {
  if (value == null) return "n/d";
  return value ? "OK" : "DIVERGE";
}

function severityClass(severity: string): string {
  if (severity === "critical") return "sev-critical";
  if (severity === "warning") return "sev-warning";
  return "sev-info";
}

function buildReportHtml(report: HistoricoOpReconReport): string {
  const inconsistencyRows = report.inconsistencies
    .map(
      (i) => `
      <tr>
        <td><span class="badge ${severityClass(i.severity)}">${esc(i.severity)}</span></td>
        <td>${esc(i.code)}</td>
        <td>${esc(i.message)}</td>
      </tr>`
    )
    .join("");

  const occurrenceRows =
    report.occurrences.length === 0
      ? `<tr><td colspan="5">Nenhuma ocorrência registada.</td></tr>`
      : report.occurrences
          .map(
            (o) => `
      <tr>
        <td>#${esc(o.number)}</td>
        <td>${esc(o.status)}</td>
        <td>${esc(o.title)}</td>
        <td>${esc(o.createdAt)}</td>
        <td>${esc(o.resolvedAt)}</td>
      </tr>
      <tr class="sub">
        <td colspan="5">${esc(o.description)}${
              o.resolution ? `<br/><em>Resolução: ${esc(o.resolution)}</em>` : ""
            }${
              o.responsible
                ? `<br/><span class="muted">Responsável: ${esc(o.responsible)}</span>`
                : ""
            }</td>
      </tr>`
          )
          .join("");

  const barcodeRows =
    report.barcodeBoxes.length === 0
      ? `<tr><td colspan="6">Nenhuma caixa com etiqueta.</td></tr>`
      : report.barcodeBoxes
          .map(
            (b) => `
      <tr class="${b.anomaly ? "row-warn" : ""}">
        <td>${esc(b.code)}</td>
        <td>${esc(b.status)}</td>
        <td>${esc(b.barcode)}</td>
        <td class="num">${esc(b.pieces)}</td>
        <td>${esc(b.packedAt)}</td>
        <td>${esc(b.anomaly)}</td>
      </tr>`
          )
          .join("");

  const orphanRows =
    report.orphans.length === 0
      ? `<tr><td colspan="5">Nenhum apontamento órfão.</td></tr>`
      : report.orphans
          .map(
            (e) => `
      <tr class="row-warn">
        <td>${esc(e.at)}</td>
        <td>${esc(e.boxCode || "—")}</td>
        <td>${esc(e.idBarras)}</td>
        <td>${esc(e.currentBarcode || "(vazio)")}</td>
        <td class="num">${esc(e.quantidadeApontada)}</td>
      </tr>`
          )
          .join("");

  const jerpEmbalagens =
    report.jerp.embalagens.length === 0
      ? "—"
      : report.jerp.embalagens
          .map((e) => `${esc(e.nome)} (${esc(e.quantidadeAlocada)})`)
          .join("; ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório OP ${esc(report.op.code)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #111;
    margin: 0;
    padding: 0;
    line-height: 1.35;
  }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 {
    font-size: 13px;
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
  }
  .muted { color: #555; }
  .meta { margin-bottom: 12px; }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    margin-bottom: 8px;
  }
  .kpi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 10px 0;
  }
  .kpi div {
    border: 1px solid #ccc;
    padding: 6px 8px;
  }
  .kpi .label { font-size: 10px; color: #555; }
  .kpi .value { font-size: 14px; font-weight: bold; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-size: 10px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.sub td { background: #fafafa; border-top: none; }
  tr.row-warn td { background: #fff4e5; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .sev-critical { background: #fee2e2; color: #991b1b; }
  .sev-warning { background: #ffedd5; color: #9a3412; }
  .sev-info { background: #e0e7ff; color: #3730a3; }
  .ok { color: #166534; font-weight: bold; }
  .bad { color: #991b1b; font-weight: bold; }
  .footer {
    margin-top: 20px;
    font-size: 9px;
    color: #666;
  }
</style>
</head>
<body>
  <h1>Relatório de auditoria — OP ${esc(report.op.code)}</h1>
  <div class="meta muted">
    Gerado em ${esc(report.generatedAt)} (BRT) · ID interno ${esc(report.op.id)} ·
    Status GDE: ${esc(report.op.status)}
  </div>

  <h2>1. Identificação</h2>
  <div class="grid">
    <div><strong>Produto:</strong> ${esc(report.types.product)} (${esc(report.types.productCode)})</div>
    <div><strong>Qtd. produzir (GDE):</strong> ${esc(report.op.quantityToProduce)}</div>
    <div><strong>Caixa tipo:</strong> ${esc(report.types.boxType)}</div>
    <div><strong>Blister tipo:</strong> ${esc(report.types.blisterType)}</div>
    <div><strong>Criada em:</strong> ${esc(report.op.createdAt)}</div>
    <div><strong>Finalizada em:</strong> ${esc(report.op.finishedAt)}</div>
  </div>

  <div class="kpi">
    <div><div class="label">Caixas</div><div class="value">${esc(report.agg.totalBoxes)}</div></div>
    <div><div class="label">Embaladas</div><div class="value">${esc(report.agg.packedBoxes)}</div></div>
    <div><div class="label">Com etiqueta</div><div class="value">${esc(report.agg.withBarcode)}</div></div>
    <div><div class="label">Peças embaladas</div><div class="value">${esc(report.agg.packedPieces)}</div></div>
    <div><div class="label">Peças c/ etiqueta</div><div class="value">${esc(report.agg.barcodePieces)}</div></div>
    <div><div class="label">Alertas (log)</div><div class="value">${esc(report.agg.alertCount)}</div></div>
    <div><div class="label">Ocorrências</div><div class="value">${esc(report.agg.occurrenceCount)}</div></div>
    <div><div class="label">Ocorr. abertas</div><div class="value">${esc(report.agg.openOccurrenceCount)}</div></div>
  </div>

  <h2>2. Alinhamento JERP</h2>
  ${
    report.jerp.available
      ? `<div class="grid">
    <div><strong>JERP id / número:</strong> ${esc(report.jerp.id)} / ${esc(report.jerp.numero)}</div>
    <div><strong>Restante (quantidadeAProduzir):</strong> ${esc(report.jerp.quantidadeAProduzir)}</div>
    <div><strong>Produto JERP:</strong> ${esc(report.jerp.produto)}</div>
    <div><strong>Embalagens:</strong> ${jerpEmbalagens}</div>
  </div>`
      : `<p class="bad">JERP indisponível: ${esc(report.jerp.error)}</p>`
  }

  <h2>3. Reconciliação GDE × JERP</h2>
  <table>
    <thead>
      <tr>
        <th>Indicador</th>
        <th>Valor</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Pendente em conteúdo ≈ restante JERP</td>
        <td class="num">${esc(report.recon.pendingDelta ?? "n/d")}</td>
        <td class="${report.recon.pendingEqJerp ? "ok" : "bad"}">${boolLabel(report.recon.pendingEqJerp)}</td>
      </tr>
      <tr>
        <td>qty − etiquetas ≈ restante JERP</td>
        <td class="num">${esc(report.recon.qtyMinusBarcode)}</td>
        <td class="${report.recon.qtyMinusBarcodeEqJerp ? "ok" : "bad"}">${boolLabel(report.recon.qtyMinusBarcodeEqJerp)}</td>
      </tr>
      <tr>
        <td>Buraco de peças (piece hole)</td>
        <td class="num">${esc(report.recon.pieceHole)}</td>
        <td class="${report.recon.pieceHole === 0 ? "ok" : "bad"}">${report.recon.pieceHole === 0 ? "OK" : "ATENÇÃO"}</td>
      </tr>
      <tr>
        <td>Baseline inferida / consumido JERP</td>
        <td class="num">${esc(report.recon.baseline)} / ${esc(report.recon.jerpConsumed)}</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Gap consumo vs etiquetas ativas</td>
        <td class="num">${esc(report.recon.gapConsumedVsBarcodes)}</td>
        <td class="${report.recon.gapConsumedVsBarcodes === 0 ? "ok" : report.recon.gapConsumedVsBarcodes == null ? "" : "bad"}">${
          report.recon.gapConsumedVsBarcodes == null
            ? "n/d"
            : report.recon.gapConsumedVsBarcodes === 0
              ? "OK"
              : "DIVERGE"
        }</td>
      </tr>
      <tr>
        <td>Soma apontamentos log / ativos / órfãos</td>
        <td class="num">${esc(report.recon.sumApontLog)} / ${esc(report.recon.sumActive)} / ${esc(report.recon.sumOrphan)}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <h2>4. Inconsistências</h2>
  <table>
    <thead>
      <tr><th>Severidade</th><th>Código</th><th>Descrição</th></tr>
    </thead>
    <tbody>${inconsistencyRows}</tbody>
  </table>

  <h2>5. Ocorrências</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Status</th><th>Título</th><th>Aberta em</th><th>Resolvida em</th></tr>
    </thead>
    <tbody>${occurrenceRows}</tbody>
  </table>

  <h2>6. Caixas com etiqueta</h2>
  <table>
    <thead>
      <tr><th>Caixa</th><th>Status</th><th>Etiqueta</th><th>Peças</th><th>Embalada</th><th>Anomalia</th></tr>
    </thead>
    <tbody>${barcodeRows}</tbody>
  </table>

  <h2>7. Apontamentos órfãos</h2>
  <table>
    <thead>
      <tr><th>Quando</th><th>Caixa</th><th>idBarras (log)</th><th>Etiqueta atual</th><th>Qtd</th></tr>
    </thead>
    <tbody>${orphanRows}</tbody>
  </table>

  <p class="footer">
    Relatório somente leitura. Não altera JERP nem GDE.
    Fonte: histórico GDE + snapshot JERP no momento da geração.
  </p>
</body>
</html>`;
}

export async function renderOpReconPdf(
  report: HistoricoOpReconReport
): Promise<Uint8Array> {
  const html = buildReportHtml(report);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

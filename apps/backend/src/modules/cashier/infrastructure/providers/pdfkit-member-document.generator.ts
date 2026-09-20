import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type { IMemberDocumentGenerator } from "../../domain/ports/member-document-generator.port";
import type {
  ReceiptModel,
  ReportModel,
} from "../../domain/member-document.models";
import {
  buildReceiptRows,
  formatBrl,
  formatDateBr,
  formatDateTimeBr,
  formatIsoDateBr,
  formatReferencePeriod,
  reversedBanner,
} from "./member-document-format";

const FOOTER_NOTE = "Documento gerado pelo ASO";

function render(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));
    try {
      draw(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function labelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
): void {
  ensureSpace(doc, 20);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`${label}: `, { continued: true })
    .font("Helvetica")
    .text(value);
}

interface Column {
  header: string;
  x: number;
  width: number;
  align?: "left" | "right";
}

function tableHeader(doc: PDFKit.PDFDocument, columns: Column[]): void {
  ensureSpace(doc, 30);
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  for (const column of columns) {
    doc.text(column.header, column.x, y, {
      width: column.width,
      align: column.align ?? "left",
    });
  }
  doc.font("Helvetica");
  doc.x = doc.page.margins.left;
  doc.y = y + 14;
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.y += 4;
}

function tableRow(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  cells: string[],
): void {
  if (doc.y + 16 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    tableHeader(doc, columns);
  }
  const y = doc.y;
  doc.font("Helvetica").fontSize(9);
  columns.forEach((column, index) => {
    doc.text(cells[index] ?? "", column.x, y, {
      width: column.width,
      height: 12,
      ellipsis: true,
      align: column.align ?? "left",
    });
  });
  doc.x = doc.page.margins.left;
  doc.y = y + 14;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 50);
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(13).text(title);
  doc.moveDown(0.4);
  doc.font("Helvetica");
}

@Injectable()
export class PdfKitMemberDocumentGenerator implements IMemberDocumentGenerator {
  generateReceipt(model: ReceiptModel): Promise<Buffer> {
    return render((doc) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("Recibo de pagamento", { align: "center" });
      doc.moveDown(1);

      const banner = reversedBanner(model);
      if (banner) {
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#b91c1c");
        doc.text(banner, { align: "center" });
        doc.fillColor("black").font("Helvetica");
        doc.moveDown(1);
      }

      for (const [label, value] of buildReceiptRows(model)) {
        labelValue(doc, label, value);
        doc.moveDown(0.3);
      }

      ensureSpace(doc, 120);
      doc.moveDown(4);
      const lineY = doc.y;
      doc
        .moveTo(150, lineY)
        .lineTo(doc.page.width - 150, lineY)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(10)
        .text("Assinatura", 50, lineY + 4, {
          align: "center",
          width: doc.page.width - 100,
        });

      doc.moveDown(3);
      doc
        .fontSize(9)
        .fillColor("gray")
        .text(FOOTER_NOTE, 50, doc.y, {
          align: "center",
          width: doc.page.width - 100,
        });
      doc.fillColor("black");
    });
  }

  generateReport(model: ReportModel): Promise<Buffer> {
    return render((doc) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("Relatório do profissional", { align: "center" });
      doc.moveDown(1);

      labelValue(doc, "Estúdio", model.studioName);
      labelValue(
        doc,
        "Profissional",
        model.memberEmail
          ? `${model.memberName} (${model.memberEmail})`
          : model.memberName,
      );
      labelValue(
        doc,
        "Período",
        `${formatIsoDateBr(model.periodFrom)} a ${formatIsoDateBr(model.periodTo)}`,
      );
      labelValue(doc, "Emitido em", formatDateTimeBr(model.issuedAt));

      // O que fez
      sectionTitle(doc, "O que fez");
      doc
        .fontSize(11)
        .text(`Serviços realizados (não cancelados): ${model.servicesCount}`);
      doc.moveDown(0.4);
      const serviceColumns: Column[] = [
        { header: "Data", x: 50, width: 60 },
        { header: "Cliente", x: 115, width: 150 },
        { header: "Serviço", x: 270, width: 130 },
        { header: "Situação", x: 405, width: 50 },
        { header: "Valor bruto", x: 460, width: 85, align: "right" },
      ];
      if (model.services.length === 0) {
        doc.fontSize(10).text("Nenhum serviço no período.");
      } else {
        tableHeader(doc, serviceColumns);
        for (const service of model.services) {
          tableRow(
            doc,
            serviceColumns,
            [
              formatDateBr(service.performedAt),
              service.customerName ?? "-",
              service.serviceName,
              service.paid ? "Pago" : "Pendente",
              formatBrl(service.amountCents),
            ],
          );
        }
      }

      // O que recebeu
      sectionTitle(doc, "O que recebeu");
      const paymentColumns: Column[] = [
        { header: "Data", x: 50, width: 70 },
        { header: "Período de referência", x: 125, width: 200 },
        { header: "Situação", x: 330, width: 80 },
        { header: "Valor", x: 415, width: 130, align: "right" },
      ];
      if (model.payments.length === 0) {
        doc.fontSize(10).text("Nenhum pagamento no período.");
      } else {
        tableHeader(doc, paymentColumns);
        for (const payment of model.payments) {
          tableRow(
            doc,
            paymentColumns,
            [
              formatDateBr(payment.paidAt),
              formatReferencePeriod(payment.periodStart, payment.periodEnd),
              payment.reversed ? "ESTORNADO" : "Pago",
              formatBrl(payment.amountCents),
            ],
          );
        }
      }
      doc.moveDown(0.4);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
          `Total pago líquido (sem estornados): ${formatBrl(model.totals.paidNetCents)}`,
        );
      doc.font("Helvetica");

      // O que foi retido + totais
      sectionTitle(doc, "O que foi retido");
      labelValue(
        doc,
        "Taxas de pagamento (serviços pagos)",
        formatBrl(model.totals.feesCents),
      );
      labelValue(
        doc,
        "Parte do estúdio (bruto - taxas - comissão)",
        formatBrl(model.totals.studioShareCents),
      );

      sectionTitle(doc, "Totais do período");
      labelValue(
        doc,
        "Receita bruta (serviços pagos)",
        formatBrl(model.totals.grossRevenueCents),
      );
      labelValue(doc, "Taxas", formatBrl(model.totals.feesCents));
      labelValue(
        doc,
        "Comissão do profissional (devida no período)",
        formatBrl(model.totals.commissionCents),
      );
      labelValue(
        doc,
        "Pago no período (líquido)",
        formatBrl(model.totals.paidNetCents),
      );
      labelValue(
        doc,
        "Saldo do período (comissão - pago)",
        formatBrl(model.totals.periodBalanceCents),
      );

      doc.moveDown(1);
      ensureSpace(doc, 60);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("gray")
        .text(
          "Nota: o saldo deste relatório refere-se apenas ao período selecionado. " +
            'O "saldo devido total" exibido na tela é vitalício (todo o histórico) e ' +
            "pode ser diferente. Valores calculados a partir dos registros persistidos " +
            "(comissão e taxas gravadas em cada serviço/transação).",
          50,
          doc.y,
          { width: doc.page.width - 100 },
        );
      doc.moveDown(0.6);
      doc.text(FOOTER_NOTE, 50, doc.y, {
        align: "center",
        width: doc.page.width - 100,
      });
      doc.fillColor("black");
    });
  }
}

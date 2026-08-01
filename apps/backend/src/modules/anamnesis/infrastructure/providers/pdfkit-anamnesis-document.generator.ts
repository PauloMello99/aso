import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type {
  AnamnesisDocumentInput,
  IAnamnesisDocumentGenerator,
} from "../../domain/ports/anamnesis-document-generator.port";

@Injectable()
export class PdfKitAnamnesisDocumentGenerator
  implements IAnamnesisDocumentGenerator
{
  async generate(input: AnamnesisDocumentInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      doc
        .fontSize(18)
        .text("Ficha de Anamnese - Termo de Consentimento", {
          align: "center",
        });
      doc.moveDown(1.5);

      doc.fontSize(14).text("Assinante");
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Nome completo: ${input.signerFullName}`);
      if (input.signerCpf) {
        doc.text(`CPF: ${input.signerCpf}`);
      }
      doc.moveDown(1);

      doc.fontSize(14).text("Perguntas e Respostas");
      doc.moveDown(0.5);
      const answersByQuestionId = new Map(
        input.answers.map((answer) => [answer.questionId, answer.value]),
      );
      for (const question of input.questionsSnapshot) {
        const value = answersByQuestionId.get(question.id);
        const formatted =
          question.type === "yes_no"
            ? value === true
              ? "Sim"
              : value === false
                ? "Não"
                : "-"
            : (value ?? "-").toString();
        doc.fontSize(11).text(`${question.label}: ${formatted}`);
      }
      doc.moveDown(1);

      doc.fontSize(14).text("Termo de Consentimento");
      doc.moveDown(0.5);
      doc.fontSize(10).text(input.consentText, { align: "justify" });
      doc.moveDown(1);

      const SIGNATURE_HEIGHT = 120;
      if (doc.y + SIGNATURE_HEIGHT > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      doc.fontSize(14).text("Assinatura");
      doc.moveDown(0.5);
      doc.image(input.signaturePng, { fit: [240, SIGNATURE_HEIGHT] });
      doc.moveDown(1);

      doc.fontSize(14).text("Evidências");
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Data/hora (ISO): ${input.signedAt.toISOString()}`)
        .text(
          `Data/hora (pt-BR): ${input.signedAt.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}`,
        )
        .text(`Id da resposta: ${input.responseId}`)
        .text(`Versão do formulário: ${input.formVersionId ?? "-"}`)
        .text(
          `Endereço IP: ${input.requestIp ?? "-"} (registrado como evidência de autoria, conforme informado no Termo de Consentimento)`,
        )
        .text(`User-Agent: ${input.requestUserAgent ?? "-"}`)
        .text(`Hash do formulário: ${input.formHash}`)
        .text(`Versão do termo de consentimento: ${input.consentVersion}`)
        .text(
          `Consentimento aceito em: ${input.consentAcceptedAt.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}`,
        );

      doc.end();
    });
  }
}

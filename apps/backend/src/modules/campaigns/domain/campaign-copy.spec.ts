import type { TiptapDoc } from "./campaign-body";
import { CAMPAIGN_DEFAULT_COPY, resolveCampaignCopy } from "./campaign-copy";

function docOf(...paragraphs: string[]): TiptapDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

describe("resolveCampaignCopy", () => {
  const base = {
    trigger: "post_service" as const,
    subjectOverride: null,
    body: null as TiptapDoc | null,
    customerName: "Ana",
    orgName: "Studio X",
  };

  it("sem override: assunto default interpolado, corpo = doc default do gatilho (não interpolado)", () => {
    const { subject, body } = resolveCampaignCopy(base);

    expect(subject).toBe("Como foi seu atendimento na Studio X?");
    expect(body).toEqual(CAMPAIGN_DEFAULT_COPY.post_service.body);
    // o corpo NÃO é interpolado aqui — o renderer interpola nos nós de texto.
    expect(JSON.stringify(body)).toContain("{{customerName}}");
  });

  it("body custom com texto vence o default", () => {
    const custom = docOf("Linha custom para {{customerName}}");

    const { body } = resolveCampaignCopy({ ...base, body: custom });

    expect(body).toBe(custom);
  });

  it("body custom sem texto visível cai no doc default do gatilho", () => {
    const emptyDocs: TiptapDoc[] = [
      { type: "doc", content: [] },
      { type: "doc", content: [{ type: "paragraph" }] },
      docOf("   ", "\t"),
    ];

    for (const empty of emptyDocs) {
      const { body } = resolveCampaignCopy({ ...base, body: empty });
      expect(body).toEqual(CAMPAIGN_DEFAULT_COPY.post_service.body);
    }
  });

  it("body malformado (jsonb objeto sem `content` array) cai no default sem lançar", () => {
    const malformed = { type: "doc" } as unknown as TiptapDoc;

    const run = () => resolveCampaignCopy({ ...base, body: malformed });

    expect(run).not.toThrow();
    expect(run().body).toEqual(CAMPAIGN_DEFAULT_COPY.post_service.body);
  });

  it("assunto: interpola tokens, remove CR/LF (anti header injection) e corta em 200", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Linha 1\r\nBcc: alvo@exemplo.com para {{orgName}}",
    });

    expect(subject).toBe("Linha 1 Bcc: alvo@exemplo.com para Studio X");
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("trunca o assunto em 200 chars mesmo quando o template passava no CHECK do banco", () => {
    // 189 + "{{orgName}}" (11 chars) == 200 -> passa no CHECK do banco; depois
    // que {{orgName}} expande vira > 200 -> tem de truncar em 200.
    const template = `${"a".repeat(189)}{{orgName}}`;

    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: template,
      orgName: "Studio Muito Longo",
    });

    expect(template.length).toBeLessThanOrEqual(200);
    expect(subject).toHaveLength(200);
  });

  it("assunto override vazio/whitespace cai no assunto default do gatilho", () => {
    const { subject } = resolveCampaignCopy({ ...base, subjectOverride: "   \n\t" });

    expect(subject).toBe("Como foi seu atendimento na Studio X?");
  });

  it("assunto: token fora da allowlist fica literal", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Oi {{customerName}} {{email}}",
    });

    expect(subject).toBe("Oi Ana {{email}}");
  });

  it("assunto: não re-substitui um customerName que contém {{orgName}}", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Oi {{customerName}}",
      customerName: "{{orgName}}",
    });

    expect(subject).toBe("Oi {{orgName}}");
  });
});

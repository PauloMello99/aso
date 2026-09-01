import { CAMPAIGN_DEFAULT_COPY, resolveCampaignCopy } from "./campaign-copy";

describe("resolveCampaignCopy", () => {
  const base = {
    trigger: "post_service" as const,
    subjectOverride: null,
    bodyOverride: null,
    customerName: "Ana",
    orgName: "Studio X",
  };

  it("usa o default do gatilho quando os overrides são NULL, já interpolado", () => {
    const { subject, bodyParagraphs } = resolveCampaignCopy(base);

    expect(subject).toBe("Como foi seu atendimento na Studio X?");
    expect(bodyParagraphs[0]).toBe("Olá, Ana!");
    expect(bodyParagraphs.join("\n")).not.toContain("{{");
  });

  it("o texto custom vence o default", () => {
    const { subject, bodyParagraphs } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Oi {{customerName}}",
      bodyOverride: "Linha custom para {{customerName}}",
    });

    expect(subject).toBe("Oi Ana");
    expect(bodyParagraphs).toEqual(["Linha custom para Ana"]);
  });

  it("faz fallback por campo: custom só no assunto, corpo cai no default", () => {
    const { subject, bodyParagraphs } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Assunto custom {{orgName}}",
    });

    expect(subject).toBe("Assunto custom Studio X");
    expect(bodyParagraphs[0]).toBe("Olá, Ana!");
    expect(bodyParagraphs.join("\n")).toContain("Studio X");
  });

  it("deixa token fora da allowlist literal", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Oi {{customerName}} {{email}}",
    });

    expect(subject).toBe("Oi Ana {{email}}");
  });

  it("não re-substitui: um customerName que contém {{orgName}} fica literal", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Oi {{customerName}}",
      customerName: "{{orgName}}",
    });

    expect(subject).toBe("Oi {{orgName}}");
  });

  it("remove CR/LF do assunto (anti header injection)", () => {
    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: "Linha 1\r\nBcc: alvo@exemplo.com",
    });

    expect(subject).toBe("Linha 1 Bcc: alvo@exemplo.com");
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("trunca o assunto em 200 chars mesmo quando o template passava no CHECK do banco", () => {
    // 189 + "{{orgName}}" (11 chars) == 200 -> passa no CHECK do banco; depois
    // que {{orgName}} expande para 18 chars vira 207 -> tem de truncar em 200.
    const template = `${"a".repeat(189)}{{orgName}}`;

    const { subject } = resolveCampaignCopy({
      ...base,
      subjectOverride: template,
      orgName: "Studio Muito Longo",
    });

    expect(template.length).toBeLessThanOrEqual(200);
    expect(subject).toHaveLength(200);
  });

  it("quebra corpo multi-linha em N parágrafos, descartando linhas vazias", () => {
    const { bodyParagraphs } = resolveCampaignCopy({
      ...base,
      bodyOverride: "Primeiro\n\n  Segundo  \n\nTerceiro",
    });

    expect(bodyParagraphs).toEqual(["Primeiro", "Segundo", "Terceiro"]);
  });

  it("corpo só de whitespace cai no default do gatilho, interpolado", () => {
    const { bodyParagraphs } = resolveCampaignCopy({
      ...base,
      bodyOverride: "   \n\t\n   ",
    });

    const expected = CAMPAIGN_DEFAULT_COPY.post_service.body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace("{{customerName}}", "Ana").replace("{{orgName}}", "Studio X"));

    expect(bodyParagraphs).toEqual(expected);
    expect(bodyParagraphs.join("\n")).toContain("Ana");
    expect(bodyParagraphs.join("\n")).not.toContain("{{");
  });
});

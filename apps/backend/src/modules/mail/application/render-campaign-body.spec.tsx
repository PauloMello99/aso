import { render } from "@react-email/render";
import {
  renderCampaignBody,
  type CampaignBodyValues,
  type TiptapDoc,
} from "./render-campaign-body";

const values: CampaignBodyValues = {
  customerName: "Ana",
  orgName: "Studio Helena",
};

function renderDoc(
  doc: TiptapDoc,
  overrides: Partial<CampaignBodyValues> = {},
): Promise<string> {
  return render(<>{renderCampaignBody(doc, { ...values, ...overrides })}</>, {
    plainText: false,
  });
}

describe("renderCampaignBody", () => {
  it("(a) escapa HTML no texto — <script> vira entidade, nunca markup (2ª barreira anti-injection)", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("&lt;script");
    expect(html).not.toContain("<script");
  });

  it("(b) interpola {{orgName}} num nó text com o valor de values.orgName", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bem-vindo à {{orgName}}" }],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("Bem-vindo à Studio Helena");
    expect(html).not.toContain("{{orgName}}");
  });

  it("(c) passe único: um customerName que contém {{orgName}} NÃO é re-substituído", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Oi {{customerName}}" }],
        },
      ],
    };

    const html = await renderDoc(doc, { customerName: "{{orgName}}", orgName: "ACME" });

    expect(html).toContain("Oi {{orgName}}");
    expect(html).not.toContain("ACME");
  });

  it("(d) heading level 2 → <h2>, level 3 → <h3>", async () => {
    const h2: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Título" }],
        },
      ],
    };
    const h3: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Subtítulo" }],
        },
      ],
    };

    const h2Html = await renderDoc(h2);
    const h3Html = await renderDoc(h3);

    expect(h2Html).toContain("<h2");
    expect(h2Html).not.toContain("<h3");
    expect(h3Html).toContain("<h3");
  });

  it("(e) marks: link → <a href>, bold → <strong>, italic → <em>", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "clique aqui",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com/promo",
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                  },
                },
              ],
            },
            { type: "text", text: "forte", marks: [{ type: "bold" }] },
            { type: "text", text: "enfase", marks: [{ type: "italic" }] },
          ],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("<a");
    expect(html).toContain('href="https://example.com/promo"');
    expect(html).toContain("<strong");
    expect(html).toContain("<em");
  });

  it("(f) bulletList/listItem → <ul>/<li> (shape real do Tiptap: li > paragraph > text)", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Primeiro item" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Primeiro item");
  });

  it("(g) image → <img> com src e alt", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "https://cdn.example.com/a.png", alt: "Foto" },
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("<img");
    expect(html).toContain('src="https://cdn.example.com/a.png"');
    expect(html).toContain('alt="Foto"');
  });

  it("(2ª barreira) image.src com esquema não-http(s) não vira <img> nem vaza no HTML, mesmo contornando o walker", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "javascript:alert(1)", alt: "x" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "conteúdo válido" }],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).toContain("conteúdo válido");
  });

  it("(2ª barreira) link mark com href de esquema perigoso renderiza só o texto, sem <a> nem o href", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "clique",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "data:text/html,x",
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).not.toContain("data:text/html");
    expect(html).not.toMatch(/<a[\s/>]/);
    expect(html).toContain("clique");
  });

  it("ignora silenciosamente nó de tipo desconhecido (defesa em profundidade, sem lançar)", async () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        { type: "blockquote", content: [{ type: "text", text: "nao deveria sair" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "parágrafo válido" }],
        },
      ],
    };

    const html = await renderDoc(doc);

    expect(html).toContain("parágrafo válido");
    expect(html).not.toContain("nao deveria sair");
  });
});

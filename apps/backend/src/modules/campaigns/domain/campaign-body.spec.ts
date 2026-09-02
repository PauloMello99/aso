import { validateCampaignBody } from "./campaign-body";
import { CampaignInvalidBodyException } from "./exceptions/campaign-invalid-body.exception";

const minimalDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "oi" }] }],
};

describe("validateCampaignBody", () => {
  it("aceita o doc mínimo válido e devolve o documento re-emitido", () => {
    expect(validateCampaignBody(minimalDoc)).toEqual(minimalDoc);
  });

  it("aceita um doc sem nós (content vazio)", () => {
    expect(validateCampaignBody({ type: "doc", content: [] })).toEqual({
      type: "doc",
      content: [],
    });
  });

  it("aceita um parágrafo vazio sem campo content", () => {
    expect(
      validateCampaignBody({ type: "doc", content: [{ type: "paragraph" }] }),
    ).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("lança quando o input não é um objeto", () => {
    expect(() => validateCampaignBody("<doc>")).toThrow(
      CampaignInvalidBodyException,
    );
    expect(() => validateCampaignBody(null)).toThrow(
      CampaignInvalidBodyException,
    );
    expect(() => validateCampaignBody([])).toThrow(CampaignInvalidBodyException);
  });

  it("lança quando o nó raiz não é do tipo doc", () => {
    expect(() =>
      validateCampaignBody({ type: "paragraph", content: [] }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("lança quando content do doc não é um array", () => {
    expect(() =>
      validateCampaignBody({ type: "doc", content: { "0": "x" } }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("não interpreta markup: texto com <script> passa como texto puro", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    };
    expect(validateCampaignBody(doc)).toEqual(doc);
  });

  it("lança para nós fora da allowlist", () => {
    for (const type of ["table", "codeBlock", "iframe", "blockquote"]) {
      expect(() =>
        validateCampaignBody({ type: "doc", content: [{ type }] }),
      ).toThrow(CampaignInvalidBodyException);
    }
  });

  it("lança para marcas fora da allowlist", () => {
    for (const markType of ["strike", "code", "underline"]) {
      expect(() =>
        validateCampaignBody({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "x", marks: [{ type: markType }] },
              ],
            },
          ],
        }),
      ).toThrow(CampaignInvalidBodyException);
    }
  });

  it("lança quando um nó text não tem o campo text", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text" }] }],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("lança quando um nó text tem surrogate UTF-16 solto (o Postgres rejeitaria o jsonb → 500)", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abc\uD800def" }],
          },
        ],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("aceita um par surrogate válido (emoji) num nó text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "😀" }],
        },
      ],
    };
    expect(validateCampaignBody(doc)).toEqual(doc);
  });

  it("lança quando image.alt tem surrogate UTF-16 solto", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://cdn/x.png", alt: "x\uDC00" } },
        ],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("aceita heading level 2 e 3", () => {
    for (const level of [2, 3]) {
      const doc = {
        type: "doc",
        content: [
          { type: "heading", attrs: { level }, content: [{ type: "text", text: "t" }] },
        ],
      };
      expect(validateCampaignBody(doc)).toEqual(doc);
    }
  });

  it("lança para heading level 1 ou 4", () => {
    for (const level of [1, 4]) {
      expect(() =>
        validateCampaignBody({
          type: "doc",
          content: [{ type: "heading", attrs: { level } }],
        }),
      ).toThrow(CampaignInvalidBodyException);
    }
  });

  it("lança para heading com atributo extra além de level", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 2, id: "x" } }],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("lança para href de link com esquema não http(s)", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,<x>",
      "vbscript:msgbox(1)",
      "//evil.com",
      "/caminho",
      "caminho/relativo",
    ]) {
      expect(() =>
        validateCampaignBody({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "link",
                  marks: [{ type: "link", attrs: { href } }],
                },
              ],
            },
          ],
        }),
      ).toThrow(CampaignInvalidBodyException);
    }
  });

  it("aceita link https e normaliza target/rel, descartando o que veio do cliente (o href sai normalizado pelo parser WHATWG, com trailing slash)", () => {
    const result = validateCampaignBody({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "  https://ok.com  ",
                    target: "_self",
                    rel: "evil",
                    class: "x",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.content).toEqual([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "link",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://ok.com/",
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it("compara o esquema do link sem diferenciar maiúsculas (parser lowercaseia o esquema)", () => {
    const result = validateCampaignBody({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "HTTPS://ok.com" } }],
            },
          ],
        },
      ],
    });

    expect(result.content).toEqual([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "link",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://ok.com/",
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it("lança quando image não tem src", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [{ type: "image", attrs: { alt: "x" } }],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("aceita image com src http(s)", () => {
    const doc = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://cdn/x.png", alt: "x" } }],
    };
    expect(validateCampaignBody(doc)).toEqual(doc);
  });

  describe("opts.imageSrcPrefix", () => {
    const PREFIX =
      "https://x.supabase.co/storage/v1/object/public/campaign-images/";

    function imageDoc(src: string) {
      return { type: "doc", content: [{ type: "image", attrs: { src } }] };
    }

    it("aceita image.src que começa com o prefixo do bucket", () => {
      const doc = imageDoc(`${PREFIX}org-1/abc.png`);
      expect(validateCampaignBody(doc, { imageSrcPrefix: PREFIX })).toEqual(doc);
    });

    it("lança para image.src http(s) fora do prefixo do bucket", () => {
      expect(() =>
        validateCampaignBody(imageDoc("https://evil.com/x.png"), {
          imageSrcPrefix: PREFIX,
        }),
      ).toThrow(CampaignInvalidBodyException);
    });

    it("sem opts, image.src http(s) de qualquer origem continua passando (legado)", () => {
      const doc = imageDoc("https://qualquer.com/x.png");
      expect(validateCampaignBody(doc)).toEqual(doc);
    });

    it("resolve dot-segments no parse: um src com ../.. que escapa do prefixo do bucket lança", () => {
      // `new URL` resolve para
      // `https://x.supabase.co/storage/v1/object/etc/x.png`, que não começa
      // com o prefixo → rejeitado.
      expect(() =>
        validateCampaignBody(imageDoc(`${PREFIX}../../etc/x.png`), {
          imageSrcPrefix: PREFIX,
        }),
      ).toThrow(CampaignInvalidBodyException);
    });
  });

  it("lança para image com atributo extra (decisão: rejeitar, não ignorar)", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://cdn/x.png", width: 10 } },
        ],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("aceita até 10 nós image e lança no 11º", () => {
    const image = { type: "image", attrs: { src: "https://cdn/x.png" } };
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: Array.from({ length: 10 }, () => image),
      }),
    ).not.toThrow();
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: Array.from({ length: 11 }, () => image),
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("aceita aninhamento de exatamente 5 níveis", () => {
    const depthFive = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "bulletList",
                  content: [
                    { type: "listItem", content: [{ type: "paragraph" }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateCampaignBody(depthFive)).not.toThrow();
  });

  it("lança quando o aninhamento passa de 5 níveis", () => {
    const depthSix = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "fundo" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateCampaignBody(depthSix)).toThrow(
      CampaignInvalidBodyException,
    );
  });

  it("lança para atributo não permitido em paragraph", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [{ type: "paragraph", attrs: { align: "center" } }],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("lança para marks fora de um nó text", () => {
    expect(() =>
      validateCampaignBody({
        type: "doc",
        content: [{ type: "paragraph", marks: [{ type: "bold" }] }],
      }),
    ).toThrow(CampaignInvalidBodyException);
  });

  it("lança quando o doc serializado passa do teto de bytes (campaigns_body_size_check)", () => {
    const oversized = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a".repeat(70000) }],
        },
      ],
    };
    expect(() => validateCampaignBody(oversized)).toThrow(
      CampaignInvalidBodyException,
    );
  });
});

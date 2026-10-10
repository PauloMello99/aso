import { resolveQuoteRequestViewerScope } from "./quote-request-viewer-scope";

describe("resolveQuoteRequestViewerScope", () => {
  it("owner ve todos os pedidos da org", () => {
    expect(
      resolveQuoteRequestViewerScope({ isOwner: true, memberUserId: "user-1" }),
    ).toEqual({ kind: "all" });
  });

  it("super_admin sem membership (agindo como owner) ve todos", () => {
    expect(
      resolveQuoteRequestViewerScope({ isOwner: true, memberUserId: null }),
    ).toEqual({ kind: "all" });
  });

  it("funcionario ve apenas os enderecados a ele", () => {
    expect(
      resolveQuoteRequestViewerScope({ isOwner: false, memberUserId: "user-2" }),
    ).toEqual({ kind: "own", userId: "user-2" });
  });

  it("funcionario sem membership nao tem escopo", () => {
    expect(
      resolveQuoteRequestViewerScope({ isOwner: false, memberUserId: null }),
    ).toBeNull();
  });
});

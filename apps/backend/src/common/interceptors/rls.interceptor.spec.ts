import { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { RlsInterceptor } from "./rls.interceptor";
import { RlsContext } from "../../database/database.module";
import type { AuthUser } from "../../modules/auth/application/ports/auth-provider.interface";
import {
  isActingAsSuperAdmin,
  type RequestWithActingContext,
} from "../request-context/acting-context";

// Sem jest.mock em "../request-context/acting-context": este spec usa o
// AsyncLocalStorage REAL. Um jest.mock de módulo com um pass-through que só
// chama `fn()` na hora não discrimina qual das duas funções (runWithActingContext
// x runWithClaims) envolve a outra "por fora" — o teste passaria igual com o
// aninhamento invertido. Por isso o fake de `RlsContext.runWithClaims` abaixo
// simula um "hook pós-commit": só depois que o `fn()` recebido resolve, ele lê
// `isActingAsSuperAdmin()`. Se `runWithActingContext` estiver por fora (correto),
// essa leitura ainda roda dentro da mesma cadeia de execução do ALS e dá o valor
// semeado. Se o aninhamento for invertido no futuro (`runWithClaims` por fora,
// `runWithActingContext` por dentro), o `fn()` interno já terá saído do
// `alsStorage.run()` antes do hook rodar, e a leitura cairia para `false`
// independente do seed — discriminando o bug.
function buildRls(onPostCommitRead: (value: boolean) => void): RlsContext {
  return {
    runWithClaims: jest.fn(
      async (_authId: string, fn: () => Promise<unknown>) => {
        const result = await fn();
        onPostCommitRead(isActingAsSuperAdmin());
        return result;
      },
    ),
  } as unknown as RlsContext;
}

function buildContext(
  request: Partial<RequestWithActingContext & { user?: AuthUser }>,
  type: "http" | "rpc" = "http",
): ExecutionContext {
  return {
    getType: jest.fn().mockReturnValue(type),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

function buildCallHandler(value: unknown = "handled"): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of(value)),
  };
}

const user: AuthUser = { id: "auth-1", email: "a@b.com", emailVerified: true };

describe("RlsInterceptor", () => {
  it("chama next.handle() direto para requisições não-HTTP, sem abrir contexto novo", async () => {
    const rls = buildRls(() => {
      throw new Error("runWithClaims não deveria ser chamado");
    });
    const interceptor = new RlsInterceptor(rls);
    const context = buildContext({ user }, "rpc");
    const next = buildCallHandler();

    const result$ = interceptor.intercept(context, next);
    await expect(firstValueFrom(result$)).resolves.toBe("handled");

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(rls.runWithClaims).not.toHaveBeenCalled();
  });

  it("chama next.handle() direto quando não há usuário autenticado", async () => {
    const rls = buildRls(() => {
      throw new Error("runWithClaims não deveria ser chamado");
    });
    const interceptor = new RlsInterceptor(rls);
    const context = buildContext({});
    const next = buildCallHandler();

    const result$ = interceptor.intercept(context, next);
    await expect(firstValueFrom(result$)).resolves.toBe("handled");

    expect(rls.runWithClaims).not.toHaveBeenCalled();
  });

  it("propaga actingAsSuperAdmin=true do request como seed do runWithActingContext, envolvendo runWithClaims por fora (comprovado por leitura pós-commit)", async () => {
    let postCommitRead: boolean | undefined;
    const rls = buildRls((value) => {
      postCommitRead = value;
    });
    const interceptor = new RlsInterceptor(rls);
    const context = buildContext({ user, actingAsSuperAdmin: true });
    const next = buildCallHandler();

    const result$ = interceptor.intercept(context, next);
    await expect(firstValueFrom(result$)).resolves.toBe("handled");

    expect(rls.runWithClaims).toHaveBeenCalledWith(
      user.id,
      expect.any(Function),
    );
    // Se `runWithActingContext` estivesse por dentro de `runWithClaims`, o
    // `fn()` recebido pelo fake já teria saído do ALS antes deste hook rodar,
    // e a leitura cairia para `false` mesmo com seed=true.
    expect(postCommitRead).toBe(true);
  });

  it("usa seed=false quando o request não foi marcado como acting super_admin pelos guards", async () => {
    let postCommitRead: boolean | undefined;
    const rls = buildRls((value) => {
      postCommitRead = value;
    });
    const interceptor = new RlsInterceptor(rls);
    const context = buildContext({ user });
    const next = buildCallHandler();

    const result$ = interceptor.intercept(context, next);
    await expect(firstValueFrom(result$)).resolves.toBe("handled");

    expect(postCommitRead).toBe(false);
  });
});

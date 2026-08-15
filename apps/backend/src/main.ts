import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TelemetryService } from "./common/telemetry/telemetry.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Confia em 1 hop de proxy reverso à frente do backend (ex.: load balancer
  // do provedor de deploy) para que `req.ip` resolva o IP real do cliente a
  // partir do X-Forwarded-For de forma validada pelo Express, em vez de
  // aceitar o header sem checagem. Sem isso, rate limiting (ThrottlerGuard)
  // e o `remoteip` enviado ao Turnstile ficam vulneráveis a spoofing e/ou
  // colapsam num limite global (todo request atrás do proxy compartilha o
  // mesmo IP percebido). Não há documentação de topologia de deploy que
  // indique mais de 1 hop até o momento desta mudança — revisar este valor
  // se a topologia (CDN + LB, múltiplos proxies encadeados, etc.) mudar.
  app.set("trust proxy", 1);

  app.enableCors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  const telemetry = app.get(TelemetryService);

  app.useGlobalFilters(new AllExceptionsFilter(telemetry));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.enableShutdownHooks();

  process.on("unhandledRejection", (reason) => {
    telemetry.captureException(reason, {
      module: "process",
      kind: "unhandledRejection",
    });
  });
  process.on("uncaughtException", (error) => {
    telemetry.captureException(error, {
      module: "process",
      kind: "uncaughtException",
    });
  });

  const port = process.env["PORT"] ?? 3001;
  await app.listen(port);
}

bootstrap();

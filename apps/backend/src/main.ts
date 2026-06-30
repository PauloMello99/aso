import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TelemetryService } from "./common/telemetry/telemetry.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

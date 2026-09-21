import { Allow } from "class-validator";

// Sem validacao de formato aqui de proposito: um erro do ValidationPipe vira
// BadRequestException e o AllExceptionsFilter global emite so
// exception.message ("Bad Request Exception"), descartando as mensagens do
// class-validator. Formato, data real, from <= to e janela maxima (366 dias)
// sao validados por parseReportPeriod (domain) -> MEMBER_REPORT_INVALID_PERIOD
// com mensagem clara. @Allow() apenas mantem os campos na whitelist do pipe.
export class MemberReportQueryDto {
  @Allow()
  from?: unknown;

  @Allow()
  to?: unknown;
}

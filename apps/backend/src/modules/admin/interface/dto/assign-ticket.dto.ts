import { IsOptional, IsUUID } from "class-validator";

/**
 * agentUserId é opcional: se omitido, o controller atribui o próprio
 * usuário logado (self-assign, o caso comum de "pegar o chamado"). Se
 * enviado, permite atribuir a outro agente (ex.: um coordenador
 * distribuindo a fila).
 */
export class AssignTicketDto {
  @IsOptional()
  @IsUUID()
  agentUserId?: string;
}

import { z } from "zod"

const SUBJECT_MAX_MESSAGE = "O assunto deve ter no máximo 200 caracteres."
const BODY_MAX_MESSAGE = "A mensagem deve ter no máximo 5000 caracteres."
const MONTHS_RANGE_MESSAGE = "Informe um número entre 1 e 36."

const subject = z.string().max(200, SUBJECT_MAX_MESSAGE)
const body = z.string().max(5000, BODY_MAX_MESSAGE)

/**
 * Form da tela de campanhas do dono (`PUT /orgs/:orgId/campaign-settings`, que
 * é replace total). Textos em branco são válidos: o backend converte `""` em
 * `null` (a organização passa a seguir o texto padrão do produto).
 *
 * `inactivityMonths` é `z.number()` (não `z.coerce.number()`): o `Select` da UI
 * só oferece números válidos e converte com `Number(value)` antes de chegar ao
 * form, então nenhuma string alcança o schema. `z.coerce` forçaria o padrão de
 * `useForm` com 3 genéricos (`z.input`/`z.output`), inexistente neste codebase,
 * e no Zod 4 o `z.input` de um número coagido é `unknown`.
 */
export const campaignSettingsSchema = z.object({
  postServiceEnabled: z.boolean(),
  birthdayEnabled: z.boolean(),
  inactivityEnabled: z.boolean(),
  inactivityMonths: z
    .number()
    .int(MONTHS_RANGE_MESSAGE)
    .min(1, MONTHS_RANGE_MESSAGE)
    .max(36, MONTHS_RANGE_MESSAGE),
  postServiceSubject: subject,
  postServiceBody: body,
  birthdaySubject: subject,
  birthdayBody: body,
  inactivitySubject: subject,
  inactivityBody: body,
})

export type CampaignSettingsFormValues = z.infer<typeof campaignSettingsSchema>

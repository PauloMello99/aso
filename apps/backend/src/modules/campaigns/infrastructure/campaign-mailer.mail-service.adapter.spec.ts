import { CampaignMailerMailServiceAdapter } from "./campaign-mailer.mail-service.adapter";
import type { MailService } from "../../mail/application/mail.service";
import type { TiptapDoc } from "../domain/campaign-body";

function buildMailService(): jest.Mocked<MailService> {
  return {
    sendCampaignByTrigger: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MailService>;
}

const body: TiptapDoc = { type: "doc", content: [] };

describe("CampaignMailerMailServiceAdapter", () => {
  it("repassa campaignSendId ao MailService como tag campaign_send_id (D-4.2)", async () => {
    const mailService = buildMailService();
    const adapter = new CampaignMailerMailServiceAdapter(mailService);

    await adapter.sendCampaign({
      to: "cliente@example.com",
      trigger: "birthday",
      subject: "Feliz aniversário!",
      body,
      customerName: "Ana",
      orgName: "Studio X",
      unsubscribeUrl: "https://app.example.com/preferencias-email/tok",
      campaignSendId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(mailService.sendCampaignByTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
      }),
    );
  });
});

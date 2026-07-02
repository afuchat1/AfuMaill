import { Router, type IRouter, type Request, type Response } from "express";
import { getResendClient } from "../lib/resend";

const router: IRouter = Router();

interface SendEmailBody {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
}

router.post("/email/send", async (req: Request, res: Response) => {
  const { to, cc, subject, body, fromEmail, fromName } = req.body as SendEmailBody;

  if (!to || to.length === 0) {
    res.status(400).json({ error: "At least one recipient is required." });
    return;
  }
  if (!subject && !body) {
    res.status(400).json({ error: "Subject or body is required." });
    return;
  }

  try {
    const resend = getResendClient();

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      ...(cc && cc.length > 0 ? { cc } : {}),
      subject: subject || "(No Subject)",
      text: body,
    });

    if (result.error) {
      req.log.warn({ err: result.error }, "Resend API error");
      res.status(502).json({ error: result.error.message });
      return;
    }

    res.json({ id: result.data?.id });
  } catch (err) {
    req.log.error({ err }, "Failed to send email via Resend");
    res.status(500).json({ error: "Failed to send email." });
  }
});

export default router;

import twilio from 'twilio';
import { prisma } from './db';

export async function sendWhatsAppNotification(params: {
    reviewerName: string;
    rating: number;
    reviewText: string;
    riskLevel: string;
    confidenceScore: number;
    reason: string;
    actionRequired: string;
}) {
    try {
        const config = await prisma.brandConfig.findFirst({
            where: { isActive: true, whatsappEnabled: true },
        });

        if (!config || !config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber || !config.whatsappAdminNumber) {
            console.log('WhatsApp notification skipped: Missing configuration');
            return { success: false, error: 'WhatsApp not configured' };
        }

        const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

        // Ensure numbers have 'whatsapp:' prefix
        const from = config.twilioPhoneNumber.startsWith('whatsapp:')
            ? config.twilioPhoneNumber
            : `whatsapp:${config.twilioPhoneNumber}`;

        const to = config.whatsappAdminNumber.startsWith('whatsapp:')
            ? config.whatsappAdminNumber
            : `whatsapp:${config.whatsappAdminNumber}`;

        const message = `🚨 *New High Risk Review Notification* 🚨\n\n` +
            `*Reviewer:* ${params.reviewerName}\n` +
            `*Rating:* ${params.rating}/10\n` +
            `*Risk Level:* ${params.riskLevel}\n` +
            `*Confidence:* ${params.confidenceScore}%\n\n` +
            `*Reason:* ${params.reason}\n\n` +
            `*Action Required:* ${params.actionRequired}\n\n` +
            `*Review Text:* "${params.reviewText.substring(0, 100)}${params.reviewText.length > 100 ? '...' : ''}"`;

        const result = await client.messages.create({
            body: message,
            from: from,
            to: to,
        });

        console.log('WhatsApp notification sent:', result.sid);
        return { success: true, messageId: result.sid };
    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        return { success: false, error: (error as Error).message };
    }
}

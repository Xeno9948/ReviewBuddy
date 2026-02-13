import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await sendWhatsAppNotification({
            reviewerName: 'Test User',
            rating: 9,
            reviewText: 'This is a test WhatsApp message from ReviewBuddy. Your integration is working!',
            riskLevel: 'None (Test)',
            confidenceScore: 100,
            reason: 'Manual connection test',
            actionRequired: 'No action needed - just confirming the connection!',
        });

        if (result.success) {
            console.log('WhatsApp Test Success, SID:', result.messageId);
            return NextResponse.json({
                message: 'Test message sent',
                sid: result.messageId,
                note: 'Check Twilio Console > Monitor > Logs for this SID to see delivery status.'
            });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('WhatsApp Test Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

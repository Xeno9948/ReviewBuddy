export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendKiyohInvite } from '@/lib/kiyoh-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request?.json?.()?.catch?.(() => ({})) ?? {};
    const { email, firstName, lastName, delay = 0, language = 'en', refCode } = body ?? {};
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const brandConfig = await prisma.brandConfig.findFirst({ where: { isActive: true } });
    
    if (!brandConfig?.kiyohApiKey || !brandConfig?.kiyohLocationId) {
      return NextResponse.json({ error: 'Kiyoh API credentials not configured' }, { status: 400 });
    }
    
    await sendKiyohInvite(
      {
        apiKey: brandConfig.kiyohApiKey,
        locationId: brandConfig.kiyohLocationId,
        tenantId: brandConfig.kiyohTenantId ?? '98',
      },
      {
        email,
        firstName,
        lastName,
        delay,
        language,
        refCode,
      }
    );
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        actionType: 'INVITE_SENT',
        humanUserId: (session.user as { id?: string })?.id,
        metadata: JSON.stringify({ email, firstName, lastName, delay, language }),
      },
    });
    
    return NextResponse.json({ success: true, message: 'Invite sent successfully' });
  } catch (error) {
    console.error('Error sending invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 }
    );
  }
}

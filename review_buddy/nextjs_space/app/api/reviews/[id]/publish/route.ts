export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { postKiyohResponse } from '@/lib/kiyoh-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const reviewId = params?.id;
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }
    
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    if (!review?.generatedResponse) {
      return NextResponse.json({ error: 'No response to publish' }, { status: 400 });
    }
    
    if (!review?.externalId) {
      return NextResponse.json({ error: 'No external review ID - cannot publish to platform' }, { status: 400 });
    }
    
    const brandConfig = await prisma.brandConfig.findFirst({ where: { isActive: true } });
    if (!brandConfig?.kiyohApiKey || !brandConfig?.kiyohLocationId) {
      return NextResponse.json({ error: 'Kiyoh API credentials not configured' }, { status: 400 });
    }
    
    const body = await request?.json?.()?.catch?.(() => ({})) ?? {};
    const { responseType = 'PUBLIC', sendEmail = false } = body ?? {};
    
    // Post response to Kiyoh
    await postKiyohResponse(
      {
        apiKey: brandConfig.kiyohApiKey,
        locationId: brandConfig.kiyohLocationId,
        tenantId: brandConfig.kiyohTenantId ?? '98',
      },
      review.externalId,
      review.generatedResponse,
      responseType,
      sendEmail
    );
    
    // Update review status
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        responseStatus: 'published',
        responsePublishedAt: new Date(),
        status: 'responded',
      },
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        reviewId: reviewId,
        actionType: 'RESPONSE_PUBLISHED',
        humanUserId: (session.user as { id?: string })?.id,
        generatedResponse: review.generatedResponse,
        metadata: JSON.stringify({ responseType, sendEmail, platform: 'kiyoh' }),
      },
    });
    
    return NextResponse.json({ success: true, message: 'Response published to Kiyoh' });
  } catch (error) {
    console.error('Error publishing response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish response' },
      { status: 500 }
    );
  }
}

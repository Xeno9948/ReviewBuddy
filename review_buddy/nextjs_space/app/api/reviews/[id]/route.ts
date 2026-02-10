export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
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
    
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        humanAssigned: {
          select: { id: true, name: true, email: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    
    const body = await request?.json?.()?.catch?.(() => ({})) ?? {};
    const { status, decision, humanNotes, humanActionTaken, generatedResponse, responseStatus } = body ?? {};
    
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    
    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (decision !== undefined) updateData.decision = decision;
    if (humanNotes !== undefined) updateData.humanNotes = humanNotes;
    if (humanActionTaken !== undefined) updateData.humanActionTaken = humanActionTaken;
    if (generatedResponse !== undefined) updateData.generatedResponse = generatedResponse;
    if (responseStatus !== undefined) updateData.responseStatus = responseStatus;
    
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });
    
    // Create audit log for the update
    await prisma.auditLog.create({
      data: {
        reviewId: reviewId,
        actionType: 'REVIEW_UPDATED',
        humanUserId: (session.user as { id?: string })?.id,
        previousDecision: existingReview?.decision,
        newDecision: decision ?? existingReview?.decision,
        metadata: JSON.stringify({
          updates: Object.keys(updateData ?? {}),
          humanNotes,
          humanActionTaken,
        }),
      },
    });
    
    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

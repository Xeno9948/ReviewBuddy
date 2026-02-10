export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

interface SlackMessage {
  reviewId?: string;
  reviewerName?: string;
  rating?: number;
  reviewText?: string;
  riskLevel?: string;
  decision?: string;
  confidenceScore?: number;
  reason?: string;
  actionRequired?: string;
  reviewUrl?: string;
}

async function sendSlackMessage(webhookUrl: string, message: SlackMessage) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🛡️ ReviewBuddy Alert',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*A review requires your attention*`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Reviewer:*\n${message?.reviewerName ?? 'Anonymous'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Rating:*\n${'⭐'.repeat(Math.min(message?.rating ?? 0, 5))} (${message?.rating ?? 0}/10)`,
        },
        {
          type: 'mrkdwn',
          text: `*Risk Level:*\n${message?.riskLevel ?? 'Unknown'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Confidence:*\n${message?.confidenceScore ?? 0}%`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Review:*\n> ${(message?.reviewText ?? '').slice(0, 200)}${(message?.reviewText?.length ?? 0) > 200 ? '...' : ''}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Why this needs attention:*\n${message?.reason ?? 'High risk or complex situation detected'}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Recommended Action:*\n${message?.actionRequired ?? 'Review and respond manually'}`,
      },
    },
  ];

  if (message?.reviewUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${message.reviewUrl}|View Review in ReviewBuddy>`,
      },
    });
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks,
      text: `ReviewBuddy Alert: ${message?.reviewerName ?? 'A customer'} left a ${message?.rating ?? 0}/10 review that needs attention.`,
    }),
  });

  if (!response?.ok) {
    throw new Error(`Slack webhook failed: ${response?.status}`);
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request?.json?.() ?? {};
    const { reviewId, customMessage } = body ?? {};

    // Get Slack config
    const config = await prisma?.brandConfig?.findFirst?.({
      where: { isActive: true },
    });

    if (!config?.slackWebhookUrl || !config?.slackEnabled) {
      return NextResponse.json(
        { error: 'Slack integration not configured or disabled' },
        { status: 400 }
      );
    }

    let message: SlackMessage = {};

    if (reviewId) {
      // Get review details
      const review = await prisma?.review?.findUnique?.({
        where: { id: reviewId },
      });

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }

      const highestRisk = [review?.contentRisk, review?.reputationalRisk, review?.contextualRisk]
        .includes('High') ? 'High' : 
        [review?.contentRisk, review?.reputationalRisk, review?.contextualRisk].includes('Medium') ? 'Medium' : 'Low';

      message = {
        reviewId: review?.id,
        reviewerName: review?.reviewerName ?? 'Anonymous',
        rating: review?.rating ?? 0,
        reviewText: review?.reviewText ?? '',
        riskLevel: highestRisk,
        decision: review?.decision ?? 'Unknown',
        confidenceScore: review?.confidenceScore ?? 0,
        reason: review?.decisionRationale ?? 'Complex situation requiring human judgment',
        actionRequired: review?.decision === 'ESCALATE_TO_HUMAN' 
          ? 'Immediate review and response needed'
          : 'Review AI-generated response before publishing',
        reviewUrl: `${process.env.NEXTAUTH_URL}/dashboard/reviews/${review?.id}`,
      };

      // Create audit log
      await prisma?.auditLog?.create?.({
        data: {
          reviewId: review?.id,
          actionType: 'SLACK_NOTIFICATION_SENT',
          humanUserId: (session?.user as { id?: string })?.id,
          metadata: JSON.stringify({ channel: config?.slackChannelName }),
        },
      });
    } else if (customMessage) {
      message = customMessage;
    } else {
      return NextResponse.json(
        { error: 'Either reviewId or customMessage is required' },
        { status: 400 }
      );
    }

    await sendSlackMessage(config?.slackWebhookUrl, message);

    return NextResponse.json({ success: true, message: 'Slack notification sent' });
  } catch (error) {
    console.error('Slack notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send Slack notification' },
      { status: 500 }
    );
  }
}

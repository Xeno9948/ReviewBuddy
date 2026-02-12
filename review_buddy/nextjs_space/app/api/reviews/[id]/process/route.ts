export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { buildRiskAssessmentPrompt, determineDecision, buildResponsePrompt } from '@/lib/risk-assessment';
import { RiskAssessment, BrandTone } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reviewId = params?.id;

  if (!reviewId) {
    return new Response(
      JSON.stringify({ error: 'Review ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return new Response(
        JSON.stringify({ error: 'Review not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Brand Config (and get API Key)
    const brandConfig = await prisma.brandConfig.findFirst({ where: { isActive: true } });
    if (!brandConfig) {
      return new Response(
        JSON.stringify({ error: 'Brand configuration not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || brandConfig.geminiApiKey;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API Key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // STEP 1: Risk Assessment
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 1, status: 'processing', message: 'Analyzing risk with Gemini...' })}\n\n`));

          const riskPrompt = buildRiskAssessmentPrompt(
            review?.reviewText ?? '',
            review?.rating ?? 0,
            review?.platform ?? 'kiyoh',
            review?.reviewerName ?? 'Anonymous'
          );

          // Call Gemini for Risk Assessment
          const riskResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: riskPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          });
          const riskResponse = riskResult.response;
          const riskContent = riskResponse.text();

          let riskAssessment: RiskAssessment;

          try {
            riskAssessment = JSON.parse(riskContent);
          } catch {
            console.error("Failed to parse Gemini risk assessment:", riskContent);
            // Fallback/Default
            riskAssessment = {
              contentRisk: 'Medium',
              reputationalRisk: 'Medium',
              contextualRisk: 'Low',
              piiDetected: false,
              legalRiskDetected: false,
              details: {
                contentRiskFactors: ['Unable to parse risk assessment'],
                reputationalRiskFactors: [],
                contextualRiskFactors: [],
              },
            };
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            step: 1,
            status: 'completed',
            message: 'Risk assessment complete',
            data: riskAssessment,
          })}\n\n`));

          // STEP 2: Decision Logic
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 2, status: 'processing', message: 'Determining decision...' })}\n\n`));

          const decisionResult = determineDecision(
            riskAssessment,
            brandConfig?.automationLevel ?? 'SEMI_AUTO'
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            step: 2,
            status: 'completed',
            message: 'Decision determined',
            data: decisionResult,
          })}\n\n`));

          // STEP 3: Response Generation (conditional)
          let generatedResponse = '';
          if (decisionResult?.decision === 'AUTO_HANDLE' || decisionResult?.decision === 'HOLD_FOR_APPROVAL') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 3, status: 'processing', message: 'Generating response with Gemini...' })}\n\n`));

            const responsePrompt = buildResponsePrompt(
              review?.reviewText ?? '',
              review?.rating ?? 0,
              brandConfig?.companyName ?? 'Our Company',
              (brandConfig?.brandTone ?? 'Professional') as BrandTone
            );

            // Call Gemini for Response Generation
            const responseResult = await model.generateContent(responsePrompt);
            generatedResponse = responseResult.response.text();

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              step: 3,
              status: 'completed',
              message: 'Response generated',
              data: { response: generatedResponse },
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              step: 3,
              status: 'skipped',
              message: 'Response generation skipped - escalation required',
            })}\n\n`));
          }

          // STEP 4: Update Review
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 4, status: 'processing', message: 'Updating review...' })}\n\n`));

          const statusMap: Record<string, string> = {
            'AUTO_HANDLE': 'approved',
            'HOLD_FOR_APPROVAL': 'pending_approval',
            'ESCALATE_TO_HUMAN': 'escalated',
          };

          await prisma.review.update({
            where: { id: reviewId },
            data: {
              contentRisk: riskAssessment?.contentRisk ?? 'Low',
              reputationalRisk: riskAssessment?.reputationalRisk ?? 'Low',
              contextualRisk: riskAssessment?.contextualRisk ?? 'Low',
              piiDetected: riskAssessment?.piiDetected ?? false,
              legalRiskDetected: riskAssessment?.legalRiskDetected ?? false,
              riskAssessmentJson: JSON.stringify(riskAssessment),
              decision: decisionResult?.decision ?? 'HOLD_FOR_APPROVAL',
              confidenceScore: decisionResult?.confidenceScore ?? 0,
              decisionRationale: decisionResult?.rationale ?? '',
              generatedResponse: generatedResponse || null,
              responseStatus: decisionResult?.decision === 'AUTO_HANDLE' ? 'generated' : 'pending',
              status: statusMap[decisionResult?.decision ?? 'HOLD_FOR_APPROVAL'] ?? 'pending_approval',
            },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            step: 4,
            status: 'completed',
            message: 'Review updated',
          })}\n\n`));

          // STEP 5: Audit Log
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 5, status: 'processing', message: 'Creating audit log...' })}\n\n`));

          await prisma.auditLog.create({
            data: {
              reviewId: reviewId,
              actionType: 'REVIEW_PROCESSED',
              riskAssessment: JSON.stringify(riskAssessment),
              decision: decisionResult?.decision ?? 'HOLD_FOR_APPROVAL',
              decisionRationale: decisionResult?.rationale ?? '',
              confidenceScore: decisionResult?.confidenceScore ?? 0,
              generatedResponse: generatedResponse || null,
            },
          });

          // Update system health
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          try {
            const existingHealth = await prisma.systemHealth.findFirst({
              where: { timestamp: { gte: today } },
            });

            if (existingHealth) {
              const updates: Record<string, unknown> = { totalReviews: (existingHealth?.totalReviews ?? 0) + 1 };
              if (decisionResult?.decision === 'AUTO_HANDLE') updates.autoHandledCount = (existingHealth?.autoHandledCount ?? 0) + 1;
              if (decisionResult?.decision === 'HOLD_FOR_APPROVAL') updates.holdForApprovalCount = (existingHealth?.holdForApprovalCount ?? 0) + 1;
              if (decisionResult?.decision === 'ESCALATE_TO_HUMAN') updates.escalatedCount = (existingHealth?.escalatedCount ?? 0) + 1;

              const total = (updates.totalReviews as number) ?? 1;
              updates.escalationRate = ((updates.escalatedCount as number) ?? (existingHealth?.escalatedCount ?? 0)) / total * 100;
              updates.avgConfidenceScore = (((existingHealth?.avgConfidenceScore ?? 0) * (existingHealth?.totalReviews ?? 0)) + (decisionResult?.confidenceScore ?? 0)) / total;

              await prisma.systemHealth.update({ where: { id: existingHealth.id }, data: updates });
            } else {
              await prisma.systemHealth.create({
                data: {
                  totalReviews: 1,
                  autoHandledCount: decisionResult?.decision === 'AUTO_HANDLE' ? 1 : 0,
                  holdForApprovalCount: decisionResult?.decision === 'HOLD_FOR_APPROVAL' ? 1 : 0,
                  escalatedCount: decisionResult?.decision === 'ESCALATE_TO_HUMAN' ? 1 : 0,
                  escalationRate: decisionResult?.decision === 'ESCALATE_TO_HUMAN' ? 100 : 0,
                  avgConfidenceScore: decisionResult?.confidenceScore ?? 0,
                },
              });
            }
          } catch (e) {
            console.error("Failed to update system health:", e)
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            step: 5,
            status: 'completed',
            message: 'Audit log created',
          })}\n\n`));

          // STEP 6: Slack Notification
          if (decisionResult?.decision === 'ESCALATE_TO_HUMAN' || riskAssessment?.legalRiskDetected) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 6, status: 'processing', message: 'Sending Slack notification...' })}\n\n`));

            try {
              if (brandConfig?.slackEnabled && brandConfig?.slackWebhookUrl) {
                // ... (Slack code remains unchanged ideally, but included for completeness)
                const highestRisk = [riskAssessment?.contentRisk, riskAssessment?.reputationalRisk, riskAssessment?.contextualRisk]
                  .includes('High') ? 'High' :
                  [riskAssessment?.contentRisk, riskAssessment?.reputationalRisk, riskAssessment?.contextualRisk].includes('Medium') ? 'Medium' : 'Low';

                const slackBlocks = [
                  { type: 'header', text: { type: 'plain_text', text: '🛡️ ReviewBuddy Alert', emoji: true } },
                  { type: 'section', text: { type: 'mrkdwn', text: '*A review requires your attention*' } },
                  { type: 'divider' },
                  {
                    type: 'section',
                    fields: [
                      { type: 'mrkdwn', text: `*Reviewer:*\n${review?.reviewerName ?? 'Anonymous'}` },
                      { type: 'mrkdwn', text: `*Rating:*\n⭐ ${review?.rating ?? 0}/10` },
                      { type: 'mrkdwn', text: `*Risk Level:*\n${highestRisk}` },
                      { type: 'mrkdwn', text: `*Confidence:*\n${decisionResult?.confidenceScore ?? 0}%` },
                    ],
                  },
                  { type: 'section', text: { type: 'mrkdwn', text: `*Review:*\n> ${(review?.reviewText ?? '').slice(0, 200)}${(review?.reviewText?.length ?? 0) > 200 ? '...' : ''}` } },
                  { type: 'section', text: { type: 'mrkdwn', text: `*Why this needs attention:*\n${decisionResult?.rationale ?? 'High risk or complex situation detected'}` } },
                ];

                await fetch(brandConfig.slackWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    blocks: slackBlocks,
                    text: `ReviewBuddy Alert: ${review?.reviewerName ?? 'A customer'} left a ${review?.rating ?? 0}/10 review that needs attention.`,
                  }),
                });

                await prisma.auditLog.create({
                  data: {
                    reviewId: reviewId,
                    actionType: 'SLACK_NOTIFICATION_SENT',
                    metadata: JSON.stringify({ channel: brandConfig?.slackChannelName }),
                  },
                });

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 6, status: 'completed', message: 'Slack notification sent' })}\n\n`));
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 6, status: 'skipped', message: 'Slack not configured' })}\n\n`));
              }
            } catch (slackError) {
              console.error('Slack notification error:', slackError);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 6, status: 'failed', message: 'Slack notification failed' })}\n\n`));
            }
          }
          // STEP 7: WhatsApp/Twilio Notification
          if (decisionResult?.decision === 'ESCALATE_TO_HUMAN' || riskAssessment?.legalRiskDetected) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 7, status: 'processing', message: 'Sending WhatsApp notification...' })}\n\n`));

            try {
              if (brandConfig?.whatsappEnabled) {
                const highestRisk = [riskAssessment?.contentRisk, riskAssessment?.reputationalRisk, riskAssessment?.contextualRisk]
                  .includes('High') ? 'High' :
                  [riskAssessment?.contentRisk, riskAssessment?.reputationalRisk, riskAssessment?.contextualRisk].includes('Medium') ? 'Medium' : 'Low';

                const whatsappResult = await sendWhatsAppNotification({
                  reviewerName: review?.reviewerName ?? 'Anonymous',
                  rating: review?.rating ?? 0,
                  reviewText: review?.reviewText ?? '',
                  riskLevel: highestRisk,
                  confidenceScore: decisionResult?.confidenceScore ?? 0,
                  reason: decisionResult?.rationale ?? 'High risk detected',
                  actionRequired: 'Manual review required - check dashboard.',
                });

                if (whatsappResult.success) {
                  await prisma.auditLog.create({
                    data: {
                      reviewId: reviewId,
                      actionType: 'WHATSAPP_NOTIFICATION_SENT',
                      metadata: JSON.stringify({ messageId: whatsappResult.messageId }),
                    },
                  });
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 7, status: 'completed', message: 'WhatsApp notification sent' })}\n\n`));
                } else {
                  console.error('WhatsApp notification failed:', whatsappResult.error);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 7, status: 'failed', message: `WhatsApp failed: ${whatsappResult.error}` })}\n\n`));
                }
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 7, status: 'skipped', message: 'WhatsApp not enabled' })}\n\n`));
              }
            } catch (whatsappError) {
              console.error('WhatsApp notification error:', whatsappError);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: 7, status: 'failed', message: 'WhatsApp notification failed' })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            final: true,
            result: {
              riskAssessment,
              decision: decisionResult,
              generatedResponse,
            },
          })}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Processing error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Processing failed',
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Process error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process review' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

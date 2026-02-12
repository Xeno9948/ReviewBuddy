const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('johndoe123', 12);

    const adminUser = await prisma.user.upsert({
        where: { email: 'john@doe.com' },
        update: {},
        create: {
            email: 'john@doe.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'admin',
        },
    });

    console.log('Created admin user:', adminUser.email);

    // Create default brand config
    const brandConfig = await prisma.brandConfig.upsert({
        where: { id: 'default-config' },
        update: {},
        create: {
            id: 'default-config',
            companyName: 'Demo Company',
            brandTone: 'Professional',
            automationLevel: 'SEMI_AUTO',
            isActive: true,
        },
    });

    console.log('Created brand config:', brandConfig.companyName);

    // Create sample reviews for demo
    const sampleReviews = [
        {
            externalId: 'demo-review-1',
            platform: 'kiyoh',
            reviewText: 'Great service! The team was very professional and helped me solve my issue quickly. Highly recommend.',
            oneLiner: 'Great experience!',
            rating: 9,
            reviewerName: 'John D.',
            reviewerCity: 'Amsterdam',
            reviewTimestamp: new Date('2026-02-08'),
            status: 'new',
        },
        {
            externalId: 'demo-review-2',
            platform: 'kiyoh',
            reviewText: 'The product arrived late and the customer service was unhelpful. Very disappointed with the experience.',
            oneLiner: 'Disappointed',
            rating: 3,
            reviewerName: 'Sarah M.',
            reviewerCity: 'Rotterdam',
            reviewTimestamp: new Date('2026-02-07'),
            status: 'new',
        },
        {
            externalId: 'demo-review-3',
            platform: 'kiyoh',
            reviewText: 'Average experience. Product was okay but delivery took longer than expected.',
            oneLiner: 'Okay service',
            rating: 6,
            reviewerName: 'Mike B.',
            reviewerCity: 'Utrecht',
            reviewTimestamp: new Date('2026-02-06'),
            status: 'new',
        },
        {
            externalId: 'demo-review-4',
            platform: 'kiyoh',
            reviewText: 'This is unacceptable! I want a full refund immediately. My lawyer will be in contact if this is not resolved. You have ruined my event!',
            oneLiner: 'Terrible!',
            rating: 1,
            reviewerName: 'Angry Customer',
            reviewerCity: 'The Hague',
            reviewTimestamp: new Date('2026-02-05'),
            status: 'new',
        },
        {
            externalId: 'demo-review-5',
            platform: 'kiyoh',
            reviewText: 'Excellent! Will definitely order again. The team went above and beyond to help me.',
            oneLiner: 'Excellent!',
            rating: 10,
            reviewerName: 'Emma V.',
            reviewerCity: 'Eindhoven',
            reviewTimestamp: new Date('2026-02-04'),
            status: 'new',
        },
    ];

    for (const review of sampleReviews) {
        await prisma.review.upsert({
            where: { externalId: review.externalId },
            update: {},
            create: review,
        });
    }

    console.log('Created', sampleReviews.length, 'sample reviews');

    // Create initial system health record
    try {
        await prisma.systemHealth.create({
            data: {
                totalReviews: sampleReviews.length,
                autoHandledCount: 0,
                holdForApprovalCount: 0,
                escalatedCount: 0,
                escalationRate: 0,
                overrideFrequency: 0,
                avgConfidenceScore: 0,
            },
        });
        console.log('Created initial system health record');
    } catch (e) {
        console.log('System health record likely exists, skipping...');
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export async function POST(req: NextRequest) {
    try {
        const { apiId, amount } = await req.json();

        if (!apiId || !amount) {
            return NextResponse.json(
                { error: 'Missing apiId or amount' },
                { status: 400 }
            );
        }

        // Validate amount (minimum ₹50.00 = 5000 paise to meet Stripe's ~£0.30/50c requirement)
        if (amount < 5000) {
            return NextResponse.json(
                { error: 'Amount must be at least ₹50.00' },
                { status: 400 }
            );
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Amount in paise
            currency: 'inr',
            metadata: {
                apiId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        console.error('Payment intent creation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
            { status: 500 }
        );
    }
}

import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { PLAN, PLAN_STATUS } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const { priceId, userId } = await req.json()

		if (!priceId || !userId) {
			return NextResponse.json({ error: 'Price ID and user ID are required' }, { status: 400 })
		}

		// Get the user from the database
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { subscription: true }
		})

		if (!user || !user.email) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// Create or get the Stripe customer
		let customerId = user.subscription?.stripeCustomerId

		if (!customerId) {
			try {
				const customer = await stripe.customers.create({
					email: user.email,
					metadata: {
						userId: user.id
					}
				})
				customerId = customer.id

				// Update user's subscription with the new customer ID
				await prisma.subscription.upsert({
					where: { userId: user.id },
					update: { stripeCustomerId: customerId },
					create: {
						userId: user.id,
						stripeCustomerId: customerId,
						stripePriceId: priceId,
						plan: 'BASIC' as PLAN,
						status: 'INACTIVE' as PLAN_STATUS,
						startDate: new Date(),
						endDate: new Date(),
						currentPeriodEnd: new Date(),
						period: 'monthly',
						nextPaymentAt: new Date(),
						lastPaymentAt: new Date()
					}
				})
			} catch (error) {
				console.error('Error creating Stripe customer:', error)
				return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 })
			}
		}

		// Create the checkout session
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			line_items: [
				{
					price: priceId,
					quantity: 1
				}
			],
			mode: 'subscription',
			success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
			cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
			metadata: {
				userId: user.id
			}
		})

		return NextResponse.json({ url: session.url })
	} catch (error) {
		console.error('Error creating checkout session:', error)
		return NextResponse.json({ error: 'Error creating checkout session' }, { status: 500 })
	}
}

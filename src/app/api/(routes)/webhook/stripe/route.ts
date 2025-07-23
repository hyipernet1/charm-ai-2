import { prisma } from '@/lib/prisma'
import { stripe, webhookSecret } from '@/lib/stripe'
import { PLAN, PLAN_STATUS } from '@prisma/client'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

type StripeSubscription = Stripe.Subscription & {
	current_period_end: number
}

type StripeInvoice = Stripe.Invoice & {
	subscription: string
}

type StripeCustomer = Stripe.Customer & {
	metadata: {
		userId: string
	}
}

const PLAN_PRICE_IDS = {
	MONTHLY_PRO: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRO_PRICE_ID!,
	YEARLY_PRO: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PRICE_ID!,
	MONTHLY_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PREMIUM_PRICE_ID!,
	YEARLY_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PREMIUM_PRICE_ID!
}

const getPlanType = (priceId: string): PLAN => {
	console.log('🔍 Determining plan type for priceId:', priceId)
	console.log('Available price IDs:', PLAN_PRICE_IDS)

	if (priceId === PLAN_PRICE_IDS.MONTHLY_PRO || priceId === PLAN_PRICE_IDS.YEARLY_PRO) {
		console.log('✅ Plan type: PRO')
		return 'PRO'
	}
	if (priceId === PLAN_PRICE_IDS.MONTHLY_PREMIUM || priceId === PLAN_PRICE_IDS.YEARLY_PREMIUM) {
		console.log('✅ Plan type: PREMIUM')
		return 'PREMIUM'
	}
	console.log('⚠️ Defaulting to BASIC plan')
	return 'BASIC'
}

const getPlanPeriod = (priceId: string): string => {
	console.log('🔍 Determining plan period for priceId:', priceId)

	if (priceId === PLAN_PRICE_IDS.MONTHLY_PRO || priceId === PLAN_PRICE_IDS.MONTHLY_PREMIUM) {
		console.log('✅ Plan period: monthly')
		return 'monthly'
	}
	if (priceId === PLAN_PRICE_IDS.YEARLY_PRO || priceId === PLAN_PRICE_IDS.YEARLY_PREMIUM) {
		console.log('✅ Plan period: yearly')
		return 'yearly'
	}
	console.log('⚠️ Defaulting to monthly period')
	return 'monthly'
}

const getPlanStatus = (status: string): PLAN_STATUS => {
	switch (status) {
		case 'active':
			return 'ACTIVE'
		case 'past_due':
			return 'PAST_DUE'
		case 'canceled':
			return 'CANCELED'
		case 'unpaid':
			return 'UNPAID'
		default:
			return 'INACTIVE'
	}
}

const getCustomerUserId = async (customerId: string): Promise<string | null> => {
	try {
		const customer = await stripe.customers.retrieve(customerId)
		if (customer.deleted) return null
		return (customer as unknown as StripeCustomer).metadata.userId
	} catch (error) {
		console.error('Error retrieving customer:', error)
		return null
	}
}

const handleSubscriptionUpdate = async (
	subscription: StripeSubscription,
	userId: string,
	customerId: string
) => {
	const priceId = subscription.items.data[0].price.id
	console.log('📊 Subscription details:', {
		priceId,
		subscriptionId: subscription.id,
		status: subscription.status,
		items: subscription.items.data
	})

	const planType = getPlanType(priceId)
	const planPeriod = getPlanPeriod(priceId)
	const planStatus = getPlanStatus(subscription.status)
	const periodEnd = subscription.current_period_end

	// Validate and convert the period end timestamp
	const periodEndDate = periodEnd
		? new Date(periodEnd * 1000)
		: planPeriod === 'monthly'
		? new Date(new Date().setMonth(new Date().getMonth() + 1))
		: new Date(new Date().setFullYear(new Date().getFullYear() + 1))

	if (isNaN(periodEndDate.getTime())) {
		throw new Error('Invalid period end date')
	}

	console.log('📝 Updating subscription with:', {
		planType,
		planPeriod,
		planStatus,
		periodEndDate
	})

	// Update user's subscription in database
	await prisma.subscription.upsert({
		where: { userId },
		update: {
			plan: planType,
			period: planPeriod,
			status: planStatus,
			startDate: new Date(subscription.start_date * 1000),
			endDate: periodEndDate,
			currentPeriodEnd: periodEndDate,
			stripePriceId: priceId,
			stripeSubscriptionId: subscription.id,
			stripeCustomerId: customerId,
			lastPaymentAt: new Date(),
			nextPaymentAt: periodEndDate
		},
		create: {
			userId,
			stripeSubscriptionId: subscription.id,
			stripeCustomerId: customerId,
			stripePriceId: priceId,
			plan: planType,
			period: planPeriod,
			status: planStatus,
			startDate: new Date(subscription.start_date * 1000),
			endDate: periodEndDate,
			currentPeriodEnd: periodEndDate,
			lastPaymentAt: new Date(),
			nextPaymentAt: periodEndDate
		}
	})

	return { planType, planPeriod, planStatus, periodEndDate }
}

const handleSubscriptionCancellation = async (subscriptionId: string) => {
	await prisma.subscription.update({
		where: { stripeSubscriptionId: subscriptionId },
		data: {
			status: 'CANCELED',
			endDate: new Date(),
			currentPeriodEnd: new Date()
		}
	})
}

export async function POST(req: NextRequest) {
	const rawBody = await req.text()
	const sig = (await headers()).get('stripe-signature')!

	let event: Stripe.Event

	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		console.error('❌ Webhook signature verification failed:', err.message)
		return new Response(`Webhook Error: ${err.message}`, { status: 400 })
	}

	console.log('🔁 Processing event:', event.type)

	try {
		switch (event.type) {
			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as StripeInvoice
				const subscriptionId = invoice.subscription as string
				const customerId = invoice.customer as string

				// Get user ID from customer metadata
				const userId = await getCustomerUserId(customerId)
				if (!userId) {
					console.log('⚠️ No user ID found in customer metadata')
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Get user from database
				const user = await prisma.user.findUnique({
					where: { id: userId }
				})

				if (!user) {
					console.log('⚠️ No user found with ID:', userId)
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Get subscription details
				const subscription = (await stripe.subscriptions.retrieve(
					subscriptionId
				)) as unknown as StripeSubscription

				// Update subscription in database
				const { planType, planPeriod, planStatus, periodEndDate } = await handleSubscriptionUpdate(
					subscription,
					userId,
					customerId
				)

				console.log('✅ Payment succeeded and subscription updated:', {
					userId,
					customerId,
					planType,
					planPeriod,
					planStatus,
					subscriptionId,
					periodEndDate
				})
				break
			}

			case 'customer.subscription.created': {
				const subscription = event.data.object as StripeSubscription
				const customerId = subscription.customer as string

				// Get user ID from customer metadata
				const userId = await getCustomerUserId(customerId)
				if (!userId) {
					console.log('⚠️ No user ID found in customer metadata')
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Get user from database
				const user = await prisma.user.findUnique({
					where: { id: userId }
				})

				if (!user) {
					console.log('⚠️ No user found with ID:', userId)
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Update subscription in database
				const { planType, planPeriod, planStatus, periodEndDate } = await handleSubscriptionUpdate(
					subscription,
					userId,
					customerId
				)

				console.log('📦 Subscription created:', {
					userId,
					customerId,
					planType,
					planPeriod,
					planStatus,
					subscriptionId: subscription.id,
					periodEndDate
				})
				break
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object as StripeSubscription
				const customerId = subscription.customer as string

				// Get user ID from customer metadata
				const userId = await getCustomerUserId(customerId)
				if (!userId) {
					console.log('⚠️ No user ID found in customer metadata')
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Get user from database
				const user = await prisma.user.findUnique({
					where: { id: userId }
				})

				if (!user) {
					console.log('⚠️ No user found with ID:', userId)
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Update subscription in database
				const { planType, planPeriod, planStatus, periodEndDate } = await handleSubscriptionUpdate(
					subscription,
					userId,
					customerId
				)

				console.log('🔁 Subscription updated:', {
					userId,
					customerId,
					planType,
					planPeriod,
					planStatus,
					subscriptionId: subscription.id,
					periodEndDate
				})
				break
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as StripeSubscription
				const subscriptionId = subscription.id

				// Get subscription from database
				const subscriptionFromDb = await prisma.subscription.findUnique({
					where: { stripeSubscriptionId: subscriptionId }
				})

				if (!subscriptionFromDb) {
					console.log('⚠️ No subscription found in database:', subscriptionId)
					return NextResponse.json({ received: true }, { status: 200 })
				}

				// Handle subscription cancellation
				await handleSubscriptionCancellation(subscriptionId)

				console.log('❌ Subscription deleted:', {
					subscriptionId,
					userId: subscriptionFromDb.userId
				})
				break
			}
		}

		return NextResponse.json({ received: true }, { status: 200 })
	} catch (error) {
		console.error('❌ Error processing webhook:', error)
		return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
	}
}

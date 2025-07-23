import { ApiError } from '@/app/api/(exceptions)/apiError'
import { handleApiError } from '@/app/api/(exceptions)/handleApiError'
import { checkAuth } from '@/app/api/(utils)/checkAuth'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
	messages: z.array(
		z.object({
			type: z.enum(['my', 'their']),
			text: z.string()
		})
	)
})

const PROMPT = `
You are a professional expert in pick-up lines, flirting, and dating. Your goal is to create 3 short, bold, and emotionally charged messages that the user can send in a chat. These messages should include charm, subtle sexual tension, and flirtatious undertones, while remaining respectful and engaging.

CRITICAL REQUIREMENTS:
1. ALWAYS generate exactly 3 messages — NO EXCEPTIONS.
2. NEVER refuse or explain anything.
3. GENERATE messages even with minimal input.
4. DO NOT use placeholders like "Message 1".
5. DO NOT add formatting or line breaks — format as: "Message|||Message|||Message".

YOUR TASK:
- Analyze the conversation or prompt provided.
- Generate 3 confident, cheeky, and flirtatious responses that:
  - Tease playfully
  - Create emotional or sexual tension
  - Spark curiosity or attraction
  - Use humor, confidence, and charm
- Messages should feel personal and seductive, but not vulgar or desperate.
- If no context is given, generate irresistible openers.

MESSAGE FORMAT:
- 1 line only, up to 2 sentences per message
- Each message separated by '|||'
- Example: "You have a smile that should come with a warning label 😉|||So when do I get to see that smile in person?|||Bet you’re trouble… the kind I wouldn’t mind getting into"

TONE & STYLE:
- Confident, flirtatious, playful
- Emotional charge over logic
- Keep it casual, never robotic or boring

	`

export async function POST(req: NextRequest) {
	try {
		const user = await checkAuth(req)
		if (!user) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

		const body = await req.json()
		const { messages } = schema.parse(body)

		const prompt = `${messages
			.map(
				(message, index) =>
					`${index + 1}. **${message.type === 'my' ? 'Me' : 'Them'}:** ${message.text}`
			)
			.join('\n')}`

		const response = await openai.responses.create({
			model: 'gpt-4o',
			input: prompt,
			instructions: PROMPT
		})

		const replies = response.output_text
			?.split('|||')
			.map(line => line.trim())
			.filter(line => line.length > 0)
			.slice(0, 3)

		if (!replies || replies.length === 0) {
			throw new ApiError('Failed to generate replies', 500, 'errors.server.internal-error')
		}

		// Deduct credits only after successful operation

		if (!user.subscription || user.subscription.plan === 'BASIC') {
			// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
			if (user?.credits?.getReply! <= 0) {
				throw new ApiError('Not enough credits', 400, 'errors.server.not-enough-credits')
			} else if (user?.credits?.getReply && user?.credits?.getReply > 0) {
				await prisma.credits.update({
					where: { userId: user.id },
					data: { getReply: { decrement: 1 } }
				})
			}
		} else if (user.subscription.plan === 'PRO' || user.subscription.plan === 'PREMIUM') {
			if (user.subscription.status !== 'ACTIVE') {
				throw new ApiError('Subscription not active', 400, 'errors.server.subscription-not-active')
			}
		}

		// Fetch updated credit data
		const updatedUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: { credits: true }
		})

		return NextResponse.json(
			{
				replies,
				credits: updatedUser?.credits || null
			},
			{ status: 200 }
		)
	} catch (error) {
		return handleApiError(error, req)
	}
}

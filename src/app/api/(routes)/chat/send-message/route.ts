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
			role: z.enum(['user', 'assistant']),
			content: z.string()
		})
	)
})

function getInstructions() {
	return `
You are a professional dating and relationship expert with years of experience. You will be in the role of an assistant. Your goal is to provide personalized, actionable advice that helps users improve their dating and relationship skills.

Your task is to:
1. Analyze the conversation history carefully
2. Provide detailed, practical advice based on the context
3. Be specific and relevant to the user's situation
4. Use a friendly, supportive tone
5. Format your response using HTML tags
6. Answer the question in the same language as the user's question

What to focus on:
- Understanding the user's specific situation and goals
- Providing step-by-step actionable advice
- Explaining psychological principles behind your suggestions
- Using real-world examples and scenarios
- Maintaining a positive, encouraging tone
- Including specific conversation starters or responses when relevant

Response requirements:
- Be detailed and thorough in your advice
- Use HTML tags to format your response for better readability
- Include specific examples and actionable steps
- Explain the reasoning behind your suggestions
- Provide multiple options when appropriate

IMPORTANT INSTRUCTIONS:
1. If you cannot answer for any reason:
   - You MUST explain why in detail
   - Format your explanation as: "I can't answer that question because [your detailed explanation]"
2. Always provide value by:
   - Breaking down complex situations into manageable steps
   - Offering specific conversation examples
   - Explaining the psychology behind your advice
   - Suggesting follow-up actions
3. Use HTML tags to format your response for better readability
`
}

export async function POST(req: NextRequest) {
	try {
		const user = await checkAuth(req)
		if (!user) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

		const body = await req.json()
		const { messages } = schema.parse(body)

		const chat = `${messages
			.map((message, i) => `${i + 1}. ${message.role}: ${message.content}`)
			.join('\n')}`

		const response = await openai.responses.create({
			model: 'gpt-4o',
			input: chat,
			instructions: getInstructions()
		})

		let reply = response.output_text

		if (!reply) throw new ApiError('No reply from AI', 500, 'errors.server.no-reply')

		if (reply.startsWith('```html')) {
			reply = reply.slice(7).trim()
		}
		if (reply.endsWith('```')) {
			reply = reply.slice(0, -3).trim()
		}
		messages.push({ role: 'assistant', content: reply })

		// Handle regular users
		if (
			!user.subscription ||
			user.subscription.plan === 'BASIC' ||
			user.subscription.plan === 'PRO'
		) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
			if (user?.credits?.getAdvice! <= 0) {
				throw new ApiError('Not enough credits', 400, 'errors.server.not-enough-credits')
			} else if (user?.credits?.getAdvice && user?.credits?.getAdvice > 0) {
				await prisma.credits.update({
					where: { userId: user.id },
					data: { getAdvice: { decrement: 1 } }
				})
			}
		} else if (user.subscription.plan === 'PREMIUM') {
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
				messages,
				credits: updatedUser?.credits || null
			},
			{ status: 200 }
		)
	} catch (error) {
		return handleApiError(error, req)
	}
}

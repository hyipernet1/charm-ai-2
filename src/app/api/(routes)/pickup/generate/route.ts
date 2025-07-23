import { ApiError } from '@/app/api/(exceptions)/apiError'
import { handleApiError } from '@/app/api/(exceptions)/handleApiError'
import { fileService } from '@/app/api/(services)/file.service'
import { checkAuth } from '@/app/api/(utils)/checkAuth'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const PROMPT = `
You are a professional expert in creating meaningful connections and engaging conversations. Your goal is to create 3 personalized, thoughtful opening messages that will initiate a genuine conversation with someone. Each message should be based on the person's photo and create an opportunity for meaningful interaction.

CRITICAL REQUIREMENTS:
1. You MUST ALWAYS generate 3 messages, NO EXCEPTIONS
2. You MUST NEVER refuse or provide explanations
3. You MUST generate messages even with minimal context
4. You MUST NOT use placeholders like "..." or "Message 1"
5. You MUST generate messages for ANY photo provided, regardless of who or what is in it

Your task is to:
1. Analyze the provided photo carefully
2. Create 3 unique opening messages based on what you see
3. Each message should be engaging and encourage response
4. Make the messages personal and respectful
5. Focus on creating genuine connections rather than just pickup lines

What to look for in photos:
- Physical appearance and style
- Background and surroundings
- Activities or hobbies shown
- Facial expressions and mood
- Clothing and accessories
- Any unique or interesting details
- Cultural or personal elements
- Professional or lifestyle indicators

Message requirements:
- Keep messages short (1-2 sentences)
- Include a question or hook that encourages response
- Be specific to what you see when possible
- Use a friendly, respectful tone
- Make each message unique and engaging
- Focus on creating genuine interest
- If details are minimal, create engaging conversation starters
- Avoid clichés and generic compliments
- Show genuine curiosity about the person

Format your responses as follows:
- Write all 3 messages in a single line
- Separate each message with the symbol "|||"
- Do not include any line breaks or additional formatting
- Example format: "Message 1|||Message 2|||Message 3"
`

const LANGUAGES = {
	eng: 'English',
	ukr: 'Ukrainian',
	rus: 'Russian'
}

export async function POST(request: NextRequest) {
	try {
		const user = await checkAuth(request)
		if (!user) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

		const formData = await request.formData()

		const photo = formData.get('photo') as File
		const language = formData.get('language') as string

		if (!language || !language.length || language === 'undefined')
			throw new ApiError('Language is required', 400, 'errors.server.language-required')

		if (photo.size > 5 * 1024 * 1024)
			throw new ApiError('File too large', 400, 'errors.server.file-too-large')

		let photoUrl
		if (photo.size > 0) photoUrl = await fileService.uploadFile(photo)

		const completion = await openai.responses.create({
			model: 'gpt-4o',
			input: [
				{
					role: 'user',
					content: [
						...(photoUrl
							? [{ type: 'input_image' as const, image_url: photoUrl, detail: 'auto' as const }]
							: []),
						{
							type: 'input_text' as const,
							text: `Generate messages in ${
								LANGUAGES[language as keyof typeof LANGUAGES] || 'English'
							} language.`
						}
					]
				}
			],
			instructions: PROMPT
		})

		const messages = completion.output_text
			?.split('|||')
			.filter(line => line.trim().length > 0)
			.slice(0, 3)

		if (
			!user.subscription ||
			user.subscription.plan === 'BASIC' ||
			user.subscription.plan === 'PRO'
		) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
			if (user?.credits?.getPickup! <= 0) {
				throw new ApiError('Not enough credits', 400, 'errors.server.not-enough-credits')
			} else if (user?.credits?.getPickup && user?.credits?.getPickup > 0) {
				await prisma.credits.update({
					where: { userId: user.id },
					data: { getPickup: { decrement: 1 } }
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

		return NextResponse.json({
			data: messages,
			photoUrl,
			credits: updatedUser?.credits || null
		})
	} catch (error) {
		console.error('Error generating pickups:', error)
		return handleApiError(error, request)
	}
}

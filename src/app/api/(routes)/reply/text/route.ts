import { handleApiError } from '@/app/api/(exceptions)/handleApiError'
import { openai } from '@/lib/openai'
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

function getInstructions() {
	return `
You are an expert in social dynamics and effective communication, skilled in generating engaging and charismatic responses in conversational contexts, particularly for romantic or flirtatious interactions. Your task is to analyze the provided chat text and generate three optimal responses that resonate with the intended recipient, ensuring they are charming, authentic, and contextually relevant. Focus on creating replies that encourage further interaction, showcase confidence, and incorporate humor or wit where appropriate. Avoid clichés and generic phrases; instead, tailor your responses to the specific nuances of the conversation. Once you receive the chat text, deliver your three responses in plain text format, separated by new lines, without any additional formatting or commentary.
	`
}

export async function POST(req: NextRequest) {
	try {
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
			instructions: getInstructions()
		})

		const replies = response.output_text.split('\n').slice(0, 3)

		return NextResponse.json({ replies }, { status: 200 })
	} catch (error) {
		return handleApiError(error)
	}
}

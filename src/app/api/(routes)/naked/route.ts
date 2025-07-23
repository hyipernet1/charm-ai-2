import { ApiError } from '@/app/api/(exceptions)/apiError'
import { handleApiError } from '@/app/api/(exceptions)/handleApiError'
import { checkAuth } from '@/app/api/(utils)/checkAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEEPSTRIP_URL = process.env.NEXT_DEEPSTRIP_URL || 'https://deepstrip.com/api/v1'
const DEEPSTRIP_API_KEY = process.env.NEXT_DEEPSTRIP_API_KEY || ''

export async function POST(req: NextRequest) {
	try {
		const user = await checkAuth(req)
		if (!user) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

		const body = await req.json()
		const { source_image } = body

		if (!source_image || !source_image.startsWith('data:image')) {
			throw new ApiError('Invalid image format', 400, 'errors.server.invalid-image')
		}

		// Проверка и списание кредитов
		if (!user.subscription || user.subscription.plan === 'BASIC') {
			if (!user.credits?.getReply || user.credits.getReply <= 0) {
				throw new ApiError('Not enough credits', 400, 'errors.server.not-enough-credits')
			}
			await prisma.credits.update({
				where: { userId: user.id },
				data: { getReply: { decrement: 1 } }
			})
		} else if (['PRO', 'PREMIUM'].includes(user.subscription.plan)) {
			if (user.subscription.status !== 'ACTIVE') {
				throw new ApiError('Subscription not active', 400, 'errors.server.subscription-not-active')
			}
		}

		// 1. Отправка изображения
		const startResponse = await fetch(`${DEEPSTRIP_URL}/undress`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${DEEPSTRIP_API_KEY}`
			},
			body: JSON.stringify({
				source_image,
				automask: true,
				style: 'premium_v2'
			})
		})

		if (!startResponse.ok) {
			throw new ApiError('Failed to start processing', startResponse.status)
		}

		const { id } = await startResponse.json()

		// 2. Проверка результата каждые 2 секунды
		let attempts = 0
		let resultImage = null

		while (resultImage === null) {
			await new Promise(resolve => setTimeout(resolve, 2000))
			attempts++

			const statusResponse = await fetch(`${DEEPSTRIP_URL}/undress/${id}`, {
				headers: {
					Authorization: `Bearer ${DEEPSTRIP_API_KEY}`
				}
			})

			if (statusResponse.status === 404) {
				throw new ApiError('Image not found', 404)
			}

			const data = await statusResponse.json()

			if (data.status === 'completed') {
				resultImage = data.image
				break
			}

			if (data.status === 'failed') {
				throw new ApiError('Processing failed', 500)
			}
		}

		if (!resultImage) {
			throw new ApiError('Timeout: Image not ready', 504)
		}

		const updatedUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: { credits: true }
		})

		return NextResponse.json(
			{
				image: resultImage,
				credits: updatedUser?.credits || null
			},
			{ status: 200 }
		)
	} catch (error) {
		return handleApiError(error, req)
	}
}

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { ApiError } from '../(exceptions)/apiError'
import { tokenService } from '../(services)/token.service'

export async function checkAuth(req: NextRequest) {
	const token = req.headers.get('Authorization')?.split(' ')[1]

	if (!token) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const userData = tokenService.validateAccess(token) as any

	if (!userData.id) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

	const userFromDb = await prisma.user.findUnique({
		where: {
			id: userData.id
		},
		include: { refreshToken: true, credits: true, subscription: true }
	})

	if (!userFromDb) throw new ApiError('Unauthorized', 401, 'errors.server.unauthorized')

	return userFromDb
}

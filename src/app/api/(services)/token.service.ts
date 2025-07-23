import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

class TokenService {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	generateTokens(payload: any) {
		const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET!, {
			expiresIn: '30m'
		})
		const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET!, {
			expiresIn: '30d'
		})

		return {
			accessToken,
			refreshToken
		}
	}

	validateAccess(token: string) {
		try {
			return jwt.verify(token, process.env.ACCESS_SECRET!)
		} catch (e) {
			return null
		}
	}

	validateRefresh(token: string) {
		try {
			return jwt.verify(token, process.env.REFRESH_SECRET!)
		} catch (e) {
			return null
		}
	}

	async saveRefresh(token: string, userId: string) {
		const tokenData = await prisma.refreshToken.findUnique({
			where: { userId }
		})

		if (tokenData) {
			return prisma.refreshToken.update({
				where: { userId },
				data: { token }
			})
		}

		return prisma.refreshToken.create({
			data: { token, userId }
		})
	}

	async findRefresh(token: string) {
		return prisma.refreshToken.findUnique({
			where: { token }
		})
	}

	async removeRefresh(token: string) {
		return prisma.refreshToken.delete({
			where: { token }
		})
	}
}

export const tokenService = new TokenService()

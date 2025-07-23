import { api } from '@/lib/axios'
import { updateStoreCredits } from '@/lib/utils'
import { Credits } from '@prisma/client'

interface NakedResponse {
	image: string
	credits: Credits | null
}

class NakedService {
	async undress(base64Image: string) {
		const res = await api.post<NakedResponse>('/naked', {
			source_image: base64Image
		})

		if (res?.status === 200) {
			if (res.data.credits) {
				updateStoreCredits(res.data.credits)
			}
			return res.data.image
		}

		throw new Error('Failed to undress image')
	}
}

export const nakedService = new NakedService()

import { useMutation } from '@tanstack/react-query'
import { nakedService } from '@/services/naked.service'

export function useUndressImage() {
	return useMutation({
		mutationFn: async (base64Image: string) => {
			return await nakedService.undress(base64Image)
		}
	})
}

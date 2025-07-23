'use client'

import { Button } from '@/components/ui/button'
import { CTA } from '@/components/ui/cta'
import { LoadingState } from '@/components/ui/loading-state'
import { useUndressImage } from '@/hooks/useNaked'
import { useAuthStore } from '@/store/auth.store'
import { AnimatePresence, motion } from 'framer-motion'
import { Image, InfinityIcon, LoaderIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import fileToBase64 from '@/util/fileToBase64'

export function PhotoUpload() {
	const { user, isAuth } = useAuthStore()
	const t = useTranslations('see-naked')
	const generalT = useTranslations()
	const [selectedImage, setSelectedImage] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [resultImage, setResultImage] = useState<string | null>(null)

	const { mutateAsync: undressImage, isPending } = useUndressImage()

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (file.size > 5 * 1024 * 1024) {
			toast.error(generalT('errors.server.file-too-large'))
			return
		}

		setSelectedImage(file)
		setPreviewUrl(URL.createObjectURL(file))
	}

	const handleGetNaked = async () => {
		if (!selectedImage) return

		try {
			const base64 = await fileToBase64(selectedImage)
			const imageUrl = await undressImage(base64)
			setResultImage(imageUrl)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			toast.error(error?.message || generalT('errors.server.internal-error'))
		}
	}

	const handleNewUpload = () => {
		setSelectedImage(null)
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
		}
		setPreviewUrl(null)
		setResultImage(null)
	}

	if (!isAuth || !user) return <LoadingState />

	return (
		<div className='max-w-2xl mx-auto space-y-6'>
			<div className='bg-white rounded-2xl shadow-xl p-6 min-h-[400px] flex flex-col'>
				<div className='mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100'>
					<h3 className='text-sm font-medium text-purple-600 mb-2'>{t('instructions.title')}</h3>
					<p className='text-gray-600 text-sm whitespace-pre-line'>{t('instructions.text')}</p>
				</div>
				<div className='flex-grow flex flex-col items-center justify-center mb-6'>
					{previewUrl ? (
						<img
							src={previewUrl}
							alt='Selected screenshot'
							className='max-w-full max-h-[300px] rounded-lg shadow-md'
						/>
					) : (
						<div className='w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center'>
							<Image className='w-12 h-12 text-gray-400' />
						</div>
					)}
				</div>

				<div className='flex justify-center mb-4'>
					<input
						type='file'
						accept='image/*'
						onChange={handleImageSelect}
						className='hidden'
						id='screenshot-upload'
					/>
					<label
						htmlFor='screenshot-upload'
						className='w-full'
					>
						<Button
							variant='outline'
							className='w-full'
							type='button'
							asChild
						>
							<span>{t('button')}</span>
						</Button>
					</label>
				</div>

				<div className='flex justify-between items-center max-sm:flex-col max-sm:gap-2'>
					<Button
						variant='outline'
						onClick={handleNewUpload}
						className='max-sm:w-full'
					>
						{t('new-upload')}
					</Button>
					<Button
						className='bg-gradient-to-r from-purple-600 to-pink-600 text-white max-sm:w-full'
						onClick={handleGetNaked}
						disabled={!selectedImage || isPending}
					>
						{isPending && <LoaderIcon className='w-4 h-4 animate-spin mr-2' />}
						{isPending ? t('processing') : t('get-result')}
					</Button>
				</div>
				<div className='text-center flex flex-col items-center mt-3 text-sm text-gray-500'>
					<div className='flex items-center gap-1'>
						<span className='text-amber-600'>
							{(user?.subscription?.plan === 'PRO' || user?.subscription?.plan === 'PREMIUM') &&
							user?.subscription?.status === 'ACTIVE' ? (
								<InfinityIcon className='w-4 h-4 text-amber-600' />
							) : (
								user?.credits?.getReply
							)}
						</span>{' '}
						{t('credits-left')}
					</div>
					<div className='flex items-center gap-1'>
						<span>{t('credits-per-photo')}</span>
					</div>
				</div>
			</div>

			<AnimatePresence>
				{resultImage && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className='space-y-6'
					>
						<div className='bg-white rounded-2xl shadow-xl p-6'>
							<div className='flex items-center gap-2 mb-4'>
								<span className='text-sm font-medium text-gray-500'>{t('ai-photo.title')}</span>
							</div>
							<div className='rounded-xl overflow-hidden border border-gray-100'>
								<img
									src={`/api/image-proxy?url=${encodeURIComponent(resultImage)}`}
									alt='Undressed AI Result'
									className='w-full h-auto object-cover'
								/>
							</div>
						</div>

						<CTA />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

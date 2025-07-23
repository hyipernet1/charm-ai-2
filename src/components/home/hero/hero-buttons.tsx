'use client'

import * as motion from 'framer-motion/client'
import { useAuthStore } from '@/store/auth.store'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '../../ui/button'
import { cn } from '@/lib/utils'

export function HeroButtons({ className }: { className?: string }) {
	const t = useTranslations('home.hero')
	const { isAuth } = useAuthStore()

	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	return (
		mounted && (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className={cn(
					'grid grid-cols-1 gap-4 justify-center mt-12 max-lg:w-full',
					isAuth ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
					className
				)}
			>
				{isAuth && (
					<Button
						asChild
						variant='outline'
						className='border-2 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 hover:text-white transition-all duration-300 h-auto text-lg max-md:text-base font-medium w-full hover:scale-[1.02] hover:shadow-xl hover:border-transparent'
					>
						<Link href='/see-naked'>
							<span>{t('buttons.to-see-naked')}</span>
						</Link>
					</Button>
				)}
				<Button
					asChild
					className='bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-all duration-300 h-auto text-lg max-md:text-base font-medium w-full hover:scale-[1.02] hover:shadow-xl'
				>
					<Link href='/get-reply/text'>
						<span>{t('buttons.manual-chat')}</span>
					</Link>
				</Button>
				<Button
					asChild
					variant='outline'
					className='border-2 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 hover:text-white transition-all duration-300 h-auto text-lg max-md:text-base font-medium w-full hover:scale-[1.02] hover:shadow-xl hover:border-transparent'
				>
					<Link href='/get-reply/screenshot'>
						<span>{t('buttons.screenshot-upload')}</span>
					</Link>
				</Button>
			</motion.div>
		)
	)
}

import * as motion from 'framer-motion/client'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '../../layout/container'
import { Button } from '../../ui/button'
import { getTranslations } from 'next-intl/server'
import { HeroButtons } from './hero-buttons'

export async function Hero() {
	const t = await getTranslations('home.hero')

	return (
		<motion.div
			initial={{ translateY: '15px', opacity: 0 }}
			animate={{ translateY: '0px', opacity: 1 }}
			transition={{ duration: 0.7, ease: 'anticipate' }}
			className='bg-gradient-to-b from-white to-purple-50'
		>
			<Container className='flex flex-col items-center justify-center py-24'>
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className='font-bold text-5xl text-center tracking-tight leading-tight max-sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600'
				>
					{t('title')}
				</motion.h1>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className='text-center text-xl text-gray-700 mt-6 max-w-2xl'
				>
					{t('subtitle')}
				</motion.p>

				<HeroButtons />

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className='grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-200 max-lg:w-full max-sm:grid-cols-1'
				>
					<Button className='flex flex-col items-center gap-2 py-10 bg-white hover:bg-gray-50 text-gray-900 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border-2 hover:border-purple-600'>
						<Link
							href='/get-advice'
							className='flex flex-col items-center gap-2'
						>
							<span className='text-3xl'>💡</span>
							<span className='font-semibold text-lg max-md:text-base'>
								{t('buttons.get-advice')}
							</span>
						</Link>
					</Button>
					<Button className='flex flex-col items-center gap-2 py-10 bg-white hover:bg-gray-50 text-gray-900 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border-2 hover:border-purple-600'>
						<Link
							href='/first-message'
							className='flex flex-col items-center gap-2'
						>
							<span className='text-3xl'>💬</span>
							<span className='font-semibold text-lg max-md:text-base'>
								{t('buttons.generate-first-message')}
							</span>
						</Link>
					</Button>
				</motion.div>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className='text-center text-gray-600 text-sm font-medium mt-16 uppercase tracking-wider'
				>
					{t('popular-platforms-title')}
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.7 }}
					className='flex items-center justify-center mx-auto gap-12 mt-8 flex-wrap'
				>
					<Image
						src='/tinder.png'
						alt='Tinder'
						width={100}
						height={24}
						className='opacity-80 hover:opacity-100 transition-opacity'
					/>
					<Image
						src='/hinge.png'
						alt='Hinge'
						width={100}
						height={42}
						className='opacity-80 hover:opacity-100 transition-opacity'
					/>
					<Image
						src='/momo.png'
						alt='Momo'
						width={100}
						height={30}
						className='opacity-80 hover:opacity-100 transition-opacity'
					/>
					<Image
						src='/okcupid.png'
						alt='OkCupid'
						width={100}
						height={32}
						className='opacity-80 hover:opacity-100 transition-opacity'
					/>
				</motion.div>
			</Container>
		</motion.div>
	)
}

'use client'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
	return (
		<div className='min-h-screen bg-gradient-to-b from-white to-purple-50 py-12'>
			<Container className='max-w-md text-center mx-auto'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='bg-white p-8 rounded-2xl shadow-xl'
				>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: 'spring', stiffness: 200, damping: 10 }}
						className='w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6'
					>
						<span className='text-4xl font-bold text-purple-600'>404</span>
					</motion.div>

					<motion.h1
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.1 }}
						className='text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600'
					>
						Page Not Found
					</motion.h1>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className='text-gray-600 mb-8'
					>
						The page you&apos;re looking for doesn&apos;t exist or has been moved.
					</motion.p>

					<Link href='/'>
						<Button className='w-full'>
							<Home className='w-4 h-4 mr-2' />
							Back to Home
						</Button>
					</Link>
				</motion.div>
			</Container>
		</div>
	)
}

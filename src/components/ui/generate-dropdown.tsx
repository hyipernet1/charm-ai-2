'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from './button'

export function GenerateDropdown() {
	const t = useTranslations('header.generate')
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)

	const options = [
		{
			key: 'manual-chat',
			href: '/get-reply/text'
		},
		{
			key: 'screenshot-upload',
			href: '/get-reply/screenshot'
		},
		{
			key: 'see-naked',
			href: '/see-naked'
		},
		{
			key: 'get-advice',
			href: '/get-advice'
		},
		{
			key: 'first-message',
			href: '/first-message'
		}
	]

	return (
		<div className='relative'>
			<button
				className='text-gray-600 cursor-pointer hover:text-purple-600 font-medium transition-all duration-300 relative group'
				onClick={() => setIsOpen(!isOpen)}
			>
				{t('title')}
				<span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 group-hover:w-full'></span>
			</button>

			{isOpen && (
				<div className='absolute left-0 top-full mt-2 w-48 rounded-md border bg-white shadow-lg z-50'>
					{options.map(option => (
						<button
							key={option.key}
							className='w-full px-4 py-2 text-left hover:bg-accent'
							onClick={() => {
								router.push(option.href)
								setIsOpen(false)
							}}
						>
							{t(`options.${option.key}`)}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

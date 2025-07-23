import { Container } from '@/components/layout/container'
import { PhotoUpload } from './PhotoUpload'
import { getTranslations } from 'next-intl/server'

export default async function PhotoNakedPage() {
	const t = await getTranslations('see-naked')
	return (
		<div className='min-h-screen bg-gradient-to-b from-white to-purple-50 py-12'>
			<Container>
				<div className='max-w-4xl mx-auto'>
					<h1 className='text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600'>
						{t('title')}
					</h1>
					<p className='text-gray-600 text-center mb-8'>{t('subtitle')}</p>

					<PhotoUpload />
				</div>
			</Container>
		</div>
	)
}

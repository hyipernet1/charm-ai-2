import en from './en.json'
import ua from './ua.json'

type TranslationKey = string
type Locale = 'en' | 'ua'

const translations = {
	en,
	ua
}

export function getTranslation(key: TranslationKey, locale: Locale = 'en'): string {
	const keys = key.split('.')
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let current: any = translations[locale]

	for (const k of keys) {
		if (current[k] === undefined) {
			return key // Return the key if translation not found
		}
		current = current[k]
	}

	return current
}

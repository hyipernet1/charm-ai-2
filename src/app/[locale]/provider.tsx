'use client'

import { clearAccessToken, getAccessToken } from '@/services/auth/auth.helper'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { HighlightInit, H } from '@highlight-run/next/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

const queryClient = new QueryClient()

export function Provider({ children }: { children: React.ReactNode }) {
	const { setUser, setIsAuth } = useAuthStore()

	useEffect(() => {
		async function checkAuth() {
			try {
				const token = getAccessToken()
				if (token) {
					const { data } = await authService.refresh()
					H.identify(data.user.email, {
						...data.user
					})
				} else {
					setUser(null)
					setIsAuth(false)
				}
			} catch (error) {
				setUser(null)
				setIsAuth(false)
				clearAccessToken()
				console.log('Error:', error)
			}
		}

		checkAuth()
	}, [])

	return (
		<QueryClientProvider client={queryClient}>
			<HighlightInit
				projectId={'1ep33l0d'}
				serviceName='Charm AI'
				tracingOrigins
				networkRecording={{
					enabled: true,
					recordHeadersAndBody: true,
					urlBlocklist: []
				}}
			/>
			{children}
		</QueryClientProvider>
	)
}

import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const url = searchParams.get('url')

	if (!url) {
		return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	try {
		const response = await fetch(url)

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			})
		}

		const contentType = response.headers.get('content-type') || 'image/jpeg'
		const buffer = await response.arrayBuffer()

		return new Response(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		})
	} catch (error) {
		console.error('Proxy error:', error)
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		})
	}
}

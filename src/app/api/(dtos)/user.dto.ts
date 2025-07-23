import { Credits, Subscription } from '@prisma/client'

export class UserTokenDto {
	id: string
	email: string

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(user: any) {
		this.id = user.id
		this.email = user.email
	}
}

export class UserDto {
	firstName: string
	lastName: string
	email: string
	id: string
	createdAt: Date
	subscription: Subscription | null
	credits: Credits | null

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(user: any) {
		this.firstName = user.firstName
		this.lastName = user.lastName
		this.email = user.email
		this.id = user.id
		this.createdAt = user.createdAt
		this.subscription = user.subscription
		this.credits = user.credits
	}
}

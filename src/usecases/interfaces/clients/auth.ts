interface EmailAddress {
	emailAddress: string;
}

interface User {
	emailAddresses: EmailAddress[];
}
interface IAuthClient {
	getUser(userId: string): Promise<User>;
}

export { type IAuthClient, type User };

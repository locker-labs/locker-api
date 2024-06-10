interface OffRampRepoAdapter {
	lockerId: number;
	beamAccountId: string;
	status: string;
	errors?: string;
}

interface OffRampInDb extends OffRampRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

export { type OffRampRepoAdapter, type OffRampInDb };

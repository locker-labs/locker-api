import {
	EAutomationBatchType,
	EAutomationUserState,
	IAutomation,
} from "../schemas/policies";

// TypeScript interface definition for the result of the SQL query
export interface IBatchedTokenTx {
	txId: number; // Corresponds to t.id
	txLockerId: number; // Corresponds to t.locker_id
	txChainId: number; // Corresponds to t.chain_id
	txHash: `0x${string}`; // Corresponds to t.tx_hash
	txFromAddress: `0x${string}`; // Corresponds to t.from_address
	txToAddress: `0x${string}`; // Corresponds to t.to_address
	txContractAddress: `0x${string}`; // Corresponds to t.contract_address
	txTokenDecimals: number; // Corresponds to t.token_decimals
	txTokenSymbol: string; // Corresponds to t.token_symbol
	txAmount: string; // Corresponds to t.amount
	txBatchedBy: string[]; // Corresponds to t.batched_by
	automationType: string; // Corresponds to a->>'type'
	automationAllocation: string; // Corresponds to a->>'allocation'
	automationUserState: EAutomationUserState; // Corresponds to a->>'userState'
	automationBatchType: EAutomationBatchType; // Corresponds to a->>'batchType'
	automationStatus: string; // Corresponds to a->>'status'
	automationRecipientAddress: `0x${string}`; // Corresponds to a->>'recipientAddress'
	lockerAddress: `0x${string}`; // Corresponds to l.address

	// Additional fields from the policies table
	policyLockerId: number; // Corresponds to p.locker_id
	policyChainId: number; // Corresponds to p.chain_id
	policyEncryptedSessionKey: string; // Corresponds to p.encrypted_session_key
	policyEncodedIv: string; // Corresponds to p.encoded_iv
	policyAutomations: IAutomation[]; // Corresponds to p.automations
}

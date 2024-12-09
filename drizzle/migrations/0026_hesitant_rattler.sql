CREATE OR REPLACE FUNCTION get_batched_tx_automations()
RETURNS TABLE(
  "txId" bigint,
  "txLockerId" bigint,
  "txChainId" bigint,
  "txHash" text,
  "txFromAddress" text,
  "txToAddress" text,
  "txContractAddress" text,
  "txTokenDecimals" integer,
  "txTokenSymbol" text,
  "txAmount" text,
  "txBatchedBy" jsonb,
  "automationType" text,
  "automationAllocation" text,
  "automationUserState" text,
  "automationBatchType" text,
  "automationStatus" text,
  "automationRecipientAddress" text,
  "policyLockerId" bigint, -- Corresponds to p.locker_id
  "policyChainId" bigint, -- Corresponds to p.chain_id
  "policyEncryptedSessionKey" text, -- Corresponds to p.encrypted_session_key
  "policyEncodedIv" text, -- Corresponds to p.encoded_iv
  "policyAutomations" jsonb, -- Corresponds to p.automations
  "lockerAddress" text -- Added locker address
) 
LANGUAGE sql
SECURITY INVOKER
AS $$
SELECT 
  t.id AS "txId",
  t.locker_id AS "txLockerId",
  t.chain_id AS "txChainId",
  t.tx_hash AS "txHash",
  t.from_address AS "txFromAddress",
  t.to_address AS "txToAddress",
  t.contract_address AS "txContractAddress",
  t.token_decimals AS "txTokenDecimals",
  t.token_symbol AS "txTokenSymbol",
  t.amount AS "txAmount",
  t.batched_by AS "txBatchedBy",
  a->>'type' AS "automationType",
  a->>'allocation' AS "automationAllocation",
  a->>'userState' AS "automationUserState",
  a->>'batchType' AS "automationBatchType",
  a->>'status' AS "automationStatus",
  a->>'recipientAddress' AS "automationRecipientAddress",
  p.locker_id AS "policyLockerId", -- Added policy lockerId
  p.chain_id AS "policyChainId", -- Added policy chainId
  p.encrypted_session_key AS "policyEncryptedSessionKey", -- Added policy encryptedSessionKey
  p.encoded_iv AS "policyEncodedIv", -- Added policy encodedIv
  p.automations AS "policyAutomations", -- Added policy automations
  l.address AS "lockerAddress" -- Added locker address
FROM token_transactions t
JOIN lockers l ON t.locker_id = l.id
JOIN policies p ON l.id = p.locker_id
JOIN jsonb_array_elements(p.automations) AS a ON true
WHERE
  t.locker_direction = 'in'
  AND t.created_at > p.updated_at
  AND a->>'type' = 'forward_to'
  AND (a->>'batchType' = 'hourly' OR a->>'batchType' = 'daily')
  AND a->>'userState' = 'on'
  AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(t.batched_by) AS b
      WHERE b = a->>'batchType'
  ); -- Exclude if batchType is in batched_by
$$;

CREATE OR REPLACE FUNCTION update_token_transactions(
    batch_type_json jsonb,
    transaction_ids bigint[]
) RETURNS void AS $$
BEGIN
    UPDATE token_transactions
    SET batched_by = batched_by || batch_type_json
    WHERE id = ANY(transaction_ids);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
import type { SuggestedParams } from "algosdk";

export type MultisigParams = {
  threshold?: number;
  addrs?: string[];
};

export type AccountNetworkData = Record<string, any>;

export type PrivateAccount = {
  addr: string;
  name: string;
  addr0?: string;
  slot?: number;
  type?: string;
  sk?: unknown;
  params?: MultisigParams | null;
  data?: Record<string, AccountNetworkData>;
  isHidden?: boolean;
};

export type ParticipationData = {
  stakingRegistration: boolean;
  voteFirst: number;
  voteLast: number;
  voteKeyDilution: number;
  selectionKey: string;
  voteKey: string;
  stateProofKey: string;
  suggestedParams?: SuggestedParams;
};

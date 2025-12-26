import type { SuggestedParams } from "algosdk";
import type { IAccountData, WalletAccount } from "@/store/wallet";

export type MultisigParams = WalletAccount["params"];

export type AccountNetworkData = IAccountData;

export type PrivateAccount = WalletAccount;

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

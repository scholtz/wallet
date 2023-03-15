import algosdk from "algosdk";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

const actions = {
  /**
   * Sign transaction
   *
   * @param {*} from
   * @param {*} signator
   * @param {*} tx
   * @returns
   */
  async signTransaction({ dispatch, commit }, { from, signator, tx }) {
    try {
      let fromAccount = this.state.wallet.privateAccounts.find(
        (a) => a.addr == from
      );
      if (!fromAccount) {
        throw new Error("The from address is not in the list of accounts.");
      }

      if (fromAccount.rekeyedTo && fromAccount.rekeyedTo != from) {
        fromAccount = this.state.wallet.privateAccounts.find(
          (a) => a.addr == fromAccount.rekeyedTo
        );
        if (!fromAccount) {
          throw new Error(
            "The rekeyed signator address from is not in the list of accounts."
          );
        }
      }

      if (fromAccount.type == "ledger") {
        // sign with ledger
        return await dispatch("signByLedger", { from: fromAccount.addr, tx });
      } else if (fromAccount.params) {
        // multisig account
        // TODO
      } else if (fromAccount.sk) {
        // standard account
        return await dispatch("signBySk", { from, tx });
      }
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
  async signByLedger({ dispatch, commit }, { from, tx }) {
    let fromAccount = this.state.wallet.privateAccounts.find(
      (a) => a.addr == from
    );
    const transport = await TransportWebUSB.request();
    const algo = new Algorand(transport);

    const { signature } = await algo.sign(
      `44'/283'/${fromAccount.slot}'/0/0`,
      Buffer.from(tx.toByte()).toString("hex")
    );
    const sigBytes = new Uint8Array(signature).slice(0, 64);
    return tx.attachSignature(from, sigBytes);
  },
  async signBySk({ dispatch, commit }, { from, tx }) {
    const sk = await dispatch(
      "wallet/getSK",
      { addr: from },
      {
        root: true,
      }
    );

    if (sk) {
      // if we have private key, sign tx
      return tx.signTxn(sk);
    }
    throw new Error("Private key not found");
  },
};
export default {
  namespaced: true,
  actions,
};

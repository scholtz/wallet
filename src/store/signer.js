import algosdk from "algosdk";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import WalletConnect from "@walletconnect/client";

const state = () => ({
  signed: {},
  toSign: {},
});

const mutations = {
  setSigned(state, signed) {
    console.log("signed", signed);
    const tx = algosdk.decodeSignedTransaction(signed);
    const txId = tx.txn.txID();
    state.signed[txId] = signed;
    console.log(`Tx ${txId} set to signed ${signed.length}`);
  },
  toSign(state, tx) {
    state.toSign = tx;
  },
};
const actions = {
  /**
   * Sign transaction
   *
   * @param {*} from
   * @param {*} signator
   * @param {*} tx
   * @returns
   */
  async signTransaction({ dispatch }, { from, signator, tx }) {
    try {
      console.log("tx", tx);
      const txObj = tx; //algosdk.decodeUnsignedTransaction(algosdk.encodeObj(tx));
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
        return await dispatch("signByLedger", {
          from: fromAccount.addr,
          tx: txObj,
        });
      } else if (fromAccount.type == "wc") {
        return await dispatch("signByWC", {
          from: fromAccount.addr,
          tx: txObj,
        });
      } else if (fromAccount.params) {
        // multisig account
        const msigTx = algosdk.createMultisigTransaction(
          txObj,
          fromAccount.params
        );
        return await dispatch("signMultisig", { msigTx, signator });
      } else if (fromAccount.sk) {
        // standard account
        return await dispatch("signBySk", { from, tx: txObj });
      }
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
  /**
   * Set the transaction to be signed. It is used by wallet connect page to set the tx for signature for custom view pages such as multisig or 2fa
   *
   * @param {*} tx
   * @returns
   */
  async toSign({ commit }, { tx }) {
    await commit("toSign", tx);
  },
  async setSigned({ commit }, { signed }) {
    await commit("setSigned", signed);
  },
  getSignerType({ dispatch }, { from }) {
    try {
      let fromAccount = this.state.wallet.privateAccounts.find(
        (a) => a.addr == from
      );
      if (!fromAccount) {
        return "?";
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
      console.log("fromAccount", fromAccount);
      if (fromAccount.type == "ledger") {
        return "ledger";
      } else if (fromAccount.params) {
        return "msig";
      } else if (fromAccount.sk) {
        return "sk";
      }
      return "?";
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
  async signByLedger({ dispatch, commit }, { from, tx }) {
    try {
      console.log("signByLedger", { from, tx });
      let fromAccount = this.state.wallet.privateAccounts.find(
        (a) => a.addr == from
      );
      const transport = await TransportWebUSB.request();
      const algo = new Algorand(transport);

      const { signature } = await algo.sign(
        `44'/283'/${fromAccount.slot}'/0/0`,
        Buffer.from(tx.toByte()).toString("hex")
      );
      console.log("signature", signature);
      const sigBytes = new Uint8Array(signature).slice(0, 64);
      const ret = tx.attachSignature(from, sigBytes);
      commit("setSigned", ret);
      return ret;
    } catch (e) {
      console.error("signByLedger.e", e);
      throw e;
    }
  },
  async signByWC({ dispatch, commit }, { from, tx }) {
    try {
      console.log("signByWC", { from, tx });

      const fromAccount = this.state.wallet.privateAccounts.find(
        (a) => a.addr == from
      );
      const connector = new WalletConnect({
        session: fromAccount.session,
        sessionStorage: {
          getSession: () => {
            return null;
          },
        },
      });

      const request = {
        method: "algo_signTxn",
        params: [
          [
            {
              txn: Buffer.from(algosdk.encodeUnsignedTransaction(tx)).toString(
                "base64"
              ),
              authAddr: from,
            },
          ],
        ],
      };

      const response = await connector.sendCustomRequest(request);

      const ret = Buffer.from(response[0], "base64");
      commit("setSigned", ret);
      return ret;
    } catch (e) {
      console.error("signByWC.e", e);
      throw e;
    }
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
      const ret = tx.signTxn(sk);
      commit("setSigned", ret);
      return ret;
    }
    throw new Error("Private key not found");
  },
  // async signByMultisig({ dispatch, commit }, { from, signator, mparams, tx }) {
  // .. same thing as algosdk.createMultisigTransaction
  //   // const mparams = {
  //   //     version: 1,
  //   //     threshold: 2,
  //   //     addrs: [
  //   //         account1.addr,
  //   //         account2.addr,
  //   //         account3.addr,
  //   //     ],
  //   // };
  //   // construct the appendable multisigned transaction format
  //   const subsigs = mparams.addrs.map((addr) => {
  //     return {
  //       pk: algosdk.decodeAddress(addr).publicKey,
  //     };
  //   });
  //   const msig = {
  //     v: mparams.version,
  //     thr: mparams.threshold,
  //     subsig: subsigs,
  //   };

  //   const signedTxn = {
  //     msig,
  //     txn: tx,
  //   };

  //   if (from !== algosdk.multisigAddress(mparams)) {
  //     signedTxn.sgnr = Buffer.from(address.decodeAddress(from).publicKey);
  //   }
  //   const msigTx = algosdk.encodeObj(signedTxn);
  //   return await dispatch("signMultisig", { msigTx, signator });
  // },
  async createMultisigTransaction({ dispatch }, { txn }) {
    console.log("signerCreateMultisigTransaction", { txn });
    if (!txn || !txn.from || !txn.from.publicKey) {
      throw new Error("Transaction object is not correct");
    }
    const from = algosdk.encodeAddress(txn.from.publicKey);
    console.log("from", from);
    let fromAccount = this.state.wallet.privateAccounts.find(
      (a) => a.addr == from
    );

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

    if (!fromAccount.params) {
      throw new Error(`Address is not multisig: ${fromAccount.addr}`);
    }
    console.log("fromAccount.params", fromAccount.params);
    return algosdk.createMultisigTransaction(txn, fromAccount.params);
  },
  async signMultisig({ dispatch }, { msigTx, signator, txn }) {
    console.log("signer.signMultisig", { msigTx, signator });
    let signatorAccount = this.state.wallet.privateAccounts.find(
      (a) => a.addr == signator
    );
    if (!signatorAccount) throw Error(`Signator account ${signator} not found`);
    if (signatorAccount.type == "ledger") {
      // sign by ledger
      return await dispatch("signMultisigByLedger", { msigTx, signator });
    } else if (signatorAccount.type == "wc") {
      return await dispatch("signMultisigByWC", { msigTx, signator });
    } else if (signatorAccount.sk) {
      // sk account
      return await dispatch("signMultisigBySk", { msigTx, signator, txn });
    }
  },
  async signMultisigBySk({ dispatch, commit }, { msigTx, signator, txn }) {
    if (!txn) throw Error("Txn cannot be empty");
    let signatorAccount = this.state.wallet.privateAccounts.find(
      (a) => a.addr == signator
    );
    if (!signatorAccount) throw Error(`Signator account ${signator} not found`);
    const signedTxn = algosdk.decodeObj(msigTx);
    const sender = algosdk.encodeAddress(signedTxn.txn.snd);
    let fromAccount = this.state.wallet.privateAccounts.find(
      (a) => a.addr == sender
    );
    if (fromAccount.rekeyedTo && fromAccount.rekeyedTo != sender) {
      fromAccount = this.state.wallet.privateAccounts.find(
        (a) => a.addr == fromAccount.rekeyedTo
      );
      if (!fromAccount) {
        throw new Error(
          "The rekeyed signator address from is not in the list of accounts."
        );
      }
    }
    console.log("signatorAccount", signatorAccount);
    const sk = new Uint8Array(Buffer.from(Object.values(signatorAccount.sk)));
    console.log(
      "append",
      // sender,
      // signedTxn,
      // signatorAccount,
      msigTx,
      fromAccount.params,
      sk
    );
    // return algosdk.appendSignMultisigTransaction(msigTx, fromAccount.params, sk)
    //   .blob;
    // const txn = algosdk.decodeUnsignedTransaction(
    //   algosdk.encodeObj(signedTxn.txn)
    // );
    console.log("tosign", { txn, sk });
    //const sigInnerTx = txn.signTxn(sk);
    const sigInnerTx = algosdk.signTransaction(txn, sk);
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx.blob);
    console.log("sigInnerTxObj", sigInnerTxObj);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig, i) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr == signator) {
        keyExist = true;
        signedTxn.msig.subsig[i].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);

    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByLedger({ dispatch, commit }, { msigTx, signator }) {
    const signedTxn = algosdk.decodeObj(msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn)
    );
    const sigInnerTx = await dispatch("signByLedger", {
      from: signator,
      tx: txn,
    });
    console.log("signMultisigByLedger.sigInnerTx", sigInnerTx);
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx);
    console.log("sigInnerTxObj", sigInnerTxObj);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig, i) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr == signator) {
        keyExist = true;
        signedTxn.msig.subsig[i].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByWC({ dispatch, commit }, { msigTx, signator }) {
    const signedTxn = algosdk.decodeObj(msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn)
    );
    const sigInnerTx = await dispatch("signByWC", {
      from: signator,
      tx: txn,
    });
    console.log("signMultisigByWC.sigInnerTx", sigInnerTx);
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx);
    console.log("sigInnerTxObj", sigInnerTxObj);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig, i) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr == signator) {
        keyExist = true;
        signedTxn.msig.subsig[i].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

<template>
  <main-layout>
    <div v-if="!$route.params.account">
      <h1>{{ $t("pay.select_account_for_payment") }}</h1>

      <select v-model="payFromDirect" class="form-control">
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name + "  - " + option.addr }}
        </option>
      </select>
    </div>
    <div v-if="account">
      <form v-if="page == 'design'" @submit="previewPaymentClick">
        <h1 v-if="!isRekey">
          {{ $t("pay.title") }} <span v-if="account">{{ account.name }}</span>
        </h1>
        <h1 v-if="isRekey">
          {{ $t("pay.rekey_title") }}
          <span v-if="account">{{ account.name }}</span>
        </h1>

        <div v-if="isRekey" class="alert alert-danger my-2">
          {{ $t("pay.rekey_warning") }}
        </div>
        <p>{{ $t("pay.selected_account") }}: {{ account.addr }}</p>
        <div v-if="isMultisig && !subpage">
          <h2>{{ $t("pay.multisig_account") }}</h2>
          <button
            class="btn btn-primary my-2"
            @click="this.subpage = 'proposal'"
          >
            {{ $t("pay.create_proposal") }}
          </button>
          <button class="btn btn-primary m-2" @click="subpage = 'sign'">
            {{ $t("pay.sign_proposal") }}
          </button>
        </div>
        <div v-if="subpage == 'sign'" class="row">
          <div class="col-12">
            <p>{{ $t("pay.signature_from_friend") }}:</p>
            <textarea
              v-model="rawSignedTxnInput"
              class="form-control my-2"
              rows="8"
            />
            <button class="btn btn-primary my-2" @click="loadMultisig">
              {{ $t("pay.load_multisig_data") }}
            </button>
          </div>
        </div>
        <div v-if="showDesignScreen" class="row">
          <div :class="scan ? 'col-8' : 'col-12'">
            <div v-if="$route.params.toAccount">
              <input
                v-if="!payTo"
                id="payTo1"
                v-model="$route.params.toAccount"
                disabled
                class="form-control"
              />
              <input
                v-else
                id="payTo2"
                v-model="payTo"
                disabled
                class="form-control"
              />
            </div>
            <div v-else>
              <div v-if="!isRekey">
                <ul class="nav nav-tabs">
                  <li class="nav-item">
                    <a
                      class="nav-link"
                      :class="genericaccount ? '' : 'active'"
                      href="#"
                      @click="genericaccount = false"
                    >
                      {{ $t("pay.pay_to_wallet") }}</a
                    >
                  </li>
                  <li class="nav-item">
                    <a
                      class="nav-link"
                      :class="genericaccount ? 'active' : ''"
                      href="#"
                      @click="genericaccount = true"
                      >{{ $t("pay.pay_to_other") }}</a
                    >
                  </li>
                </ul>

                <input
                  v-if="genericaccount"
                  id="payTo"
                  v-model="payTo"
                  class="form-control"
                />
                <select
                  v-if="!genericaccount"
                  v-model="payTo"
                  class="form-control"
                >
                  <option
                    v-for="option in $store.state.wallet.privateAccounts"
                    :key="option.addr"
                    :value="option.addr"
                  >
                    {{ option.name + "  - " + option.addr }}
                  </option>
                </select>
                <div v-if="genericaccount">
                  <button
                    class="btn btn-primary btn-xs m-2"
                    @click="toggleCamera"
                  >
                    {{ $t("pay.toggle_camera") }}
                  </button>
                  <p>
                    {{ $t("pay.store_other_help") }}
                  </p>
                </div>
              </div>
              <div v-if="forcedAssetNotLoaded" class="alert alert-danger my-2">
                {{ $t("pay.asset_failed_to_load") }}
              </div>
            </div>
            <div v-if="isRekey">
              <ul class="nav nav-tabs">
                <li class="nav-item">
                  <a
                    class="nav-link"
                    :class="genericaccountRekey ? '' : 'active'"
                    href="#"
                    @click="genericaccountRekey = false"
                  >
                    {{ $t("pay.rekey_to_wallet_account") }}</a
                  >
                </li>
                <li class="nav-item">
                  <a
                    class="nav-link"
                    :class="genericaccountRekey ? 'active' : ''"
                    href="#"
                    @click="genericaccountRekey = true"
                    >{{ $t("pay.rekey_to_external_account") }}</a
                  >
                </li>
              </ul>

              <input
                v-if="genericaccountRekey"
                id="rekeyTo"
                v-model="rekeyTo"
                class="form-control"
              />
              <select
                v-if="!genericaccountRekey"
                v-model="rekeyTo"
                class="form-control"
              >
                <option
                  v-for="option in $store.state.wallet.privateAccounts"
                  :key="option.addr"
                  :value="option.addr"
                >
                  {{ option.name + "  - " + option.addr }}
                </option>
              </select>
              <div v-if="genericaccountRekey">
                <button
                  class="btn btn-primary btn-xs m-2"
                  @click="toggleCamera"
                >
                  {{ $t("pay.toggle_camera") }}
                </button>
                <p>
                  {{ $t("pay.store_other_help") }}
                </p>
              </div>
            </div>
            <div>
              <label for="asset">{{ $t("pay.asset") }}</label>
              <input
                v-if="forceAsset && assetObj && assetObj.name"
                v-model="assetObj.name"
                class="form-control"
                disabled
              />
              <select v-else id="asset" v-model="asset" class="form-control">
                <option
                  v-for="assetInfo in assets"
                  :key="assetInfo['asset-id']"
                  :value="assetInfo['asset-id']"
                >
                  {{ assetInfo["name"] }} ({{
                    $filters.formatCurrency(
                      assetInfo["amount"],
                      assetInfo["name"],
                      assetInfo["decimals"]
                    )
                  }})
                </option>
              </select>
            </div>
            <div v-if="payamountGtMaxAmount" class="alert alert-danger my-2">
              {{ $t("pay.asset_too_small_balance") }}
            </div>
            <div v-if="!isRekey">
              <label for="payamount" class="">{{ $t("pay.amount") }}</label>
              <div class="input-group">
                <input
                  id="payamount"
                  v-model="payamount"
                  type="number"
                  min="0"
                  :max="maxAmount"
                  :step="stepAmount"
                  class="form-control"
                />
                <input
                  v-if="assetUnit"
                  disabled
                  :value="assetUnit"
                  class="col-2"
                />
                <button
                  class="col-2 btn btn-outline-secondary"
                  @click="setMaxAmount"
                >
                  {{ $t("pay.set_max") }}
                </button>
              </div>
            </div>
            <div>
              <label for="fee">{{ $t("pay.fee") }}</label>
              <div class="input-group">
                <input
                  id="fee"
                  v-model="fee"
                  type="number"
                  min="0.001"
                  max="1"
                  step="0.001"
                  class="form-control"
                />
                <input
                  disabled
                  :value="this.$store.state.config.tokenSymbol"
                  class="col-4"
                />
              </div>
            </div>
            <div>
              <label for="paynote">{{ $t("pay.note") }}</label>
              <input id="paynote" v-model="paynote" class="form-control" />
            </div>

            <div v-if="noteIsB64" class="form-check m-1">
              <input
                id="paynoteB64"
                v-model="paynoteB64"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="paynoteB64">
                {{ $t("pay.note_is_b64") }}
              </label>
            </div>

            <div>
              <label for="env">{{ $t("pay.environment") }}</label>
              <input
                id="env"
                :value="$store.state.config.env"
                class="form-control"
                disabled
              />
            </div>
            <div>
              <input
                :disabled="isNotValid"
                class="btn btn-primary my-2"
                type="submit"
                :value="$t('pay.review_payment')"
              />
              <input
                v-if="isMultisig"
                class="btn btn-light m-2"
                value="Cancel"
                @click="subpage = ''"
              />
              <input
                v-if="!isMultisig"
                class="btn btn-light m-2"
                value="Cancel"
                @click="$router.push('/accounts')"
              />
            </div>
          </div>

          <div v-if="scan" class="col-4">
            <QrcodeStream @decode="onDecodeQR" />
          </div>
        </div>
      </form>
      <form v-if="page == 'review'" @submit="payPaymentClick">
        <h1>{{ $t("pay.review_payment") }}</h1>
        <p>{{ $t("pay.review_payment_help") }}</p>
        <div class="row">
          <div class="col">
            <table v-if="!multisigDecoded.txn" class="w-100">
              <tr>
                <th>{{ $t("pay.from_account") }}:</th>
                <td>{{ payFrom }}</td>
              </tr>
              <tr v-if="malformedAddress">
                <td colspan="2">
                  <div class="alert alert-danger">
                    {{ $t("pay.pay_to_address_malformed") }}
                  </div>
                </td>
              </tr>
              <tr v-if="txn && txn.type">
                <th>{{ $t("pay.tx_type") }}:</th>
                <td>{{ txn.type }}</td>
              </tr>
              <tr v-if="payTo">
                <th>{{ $t("pay.pay_to") }}:</th>
                <td>{{ payTo }}</td>
              </tr>
              <tr v-if="paynote">
                <th>{{ $t("pay.note") }}:</th>
                <td v-if="paynote.length < 50">
                  {{ paynote }}
                </td>
                <td v-else>
                  <JsonViewer :value="paynote" copyable boxed sort />
                </td>
              </tr>
              <tr>
                <th>{{ $t("pay.environment") }}:</th>
                <td>{{ $store.state.config.env }}</td>
              </tr>
              <tr v-if="assetObj">
                <th>{{ $t("optin.assetId") }}:</th>
                <td>
                  {{ assetObj["asset-id"] ? assetObj["asset-id"] : "Algo" }}
                </td>
              </tr>
              <tr>
                <th>{{ $t("pay.amount") }}:</th>
                <td v-if="assetObj">
                  {{
                    $filters.formatCurrency(
                      amountLong,
                      assetObj.name,
                      assetObj.decimals
                    )
                  }}
                </td>
                <td v-else>
                  {{ $filters.formatCurrency(amountLong) }}
                </td>
              </tr>
              <tr>
                <th>{{ $t("pay.fee") }}:</th>
                <td>{{ $filters.formatCurrency(feeLong) }}</td>
              </tr>
              <tr v-if="!asset">
                <th>{{ $t("pay.total") }}:</th>
                <td>{{ $filters.formatCurrency(amountLong + feeLong) }}</td>
              </tr>
              <tr v-if="rekeyTo">
                <th>{{ $t("pay.rekey_to") }}:</th>
                <td class="alert alert-danger">
                  {{ rekeyTo }}
                </td>
              </tr>
            </table>

            <div v-if="multisigDecoded.txn">
              <h2>{{ $t("pay.transaction_details") }}</h2>
              <table class="w-100">
                <tr>
                  <th>{{ $t("pay.type") }}</th>
                  <td>{{ multisigDecoded.txn.type }}</td>
                </tr>
                <tr>
                  <th>{{ $t("pay.name") }}</th>
                  <td>{{ multisigDecoded.txn.name }}</td>
                </tr>
                <tr v-if="multisigDecoded.txn.amount">
                  <th>{{ $t("pay.amount") }}</th>
                  <td>
                    {{ $filters.formatCurrency(multisigDecoded.txn.amount) }}
                  </td>
                </tr>
                <tr>
                  <th>{{ $t("pay.fee") }}</th>
                  <td>
                    {{ $filters.formatCurrency(multisigDecoded.txn.fee) }}
                  </td>
                </tr>
                <tr>
                  <th>{{ $t("pay.first_round") }}</th>
                  <td>{{ multisigDecoded.txn.firstRound }}</td>
                </tr>
                <tr>
                  <th>{{ $t("pay.last_round") }}</th>
                  <td>{{ multisigDecoded.txn.lastRound }}</td>
                </tr>
                <tr>
                  <th>{{ $t("pay.genesis") }}</th>
                  <td>{{ multisigDecoded.txn.genesisID }}</td>
                </tr>
                <tr>
                  <th>{{ $t("pay.note") }}</th>
                  <td v-if="multisigDecoded.txn.note">
                    {{ msigNote }}
                  </td>
                </tr>
                <tr>
                  <th>{{ $t("pay.tag") }}</th>
                  <td>{{ multisigDecoded.txn.tag }}</td>
                </tr>
                <tr
                  v-if="
                    multisigDecoded.txn.reKeyTo &&
                    multisigDecoded.txn.reKeyTo.publicKey
                  "
                >
                  <th>{{ $t("pay.rekey_to") }}</th>
                  <td class="alert alert-danger">
                    {{ encodeAddress(multisigDecoded.txn.reKeyTo.publicKey) }}
                  </td>
                </tr>
                <tr
                  v-if="
                    multisigDecoded.txn.to && multisigDecoded.txn.to.publicKey
                  "
                >
                  <th>{{ $t("pay.to_account") }}</th>
                  <td>{{ encodeAddress(multisigDecoded.txn.to.publicKey) }}</td>
                </tr>
              </table>
            </div>
          </div>
          <div class="col" v-if="multisigDecoded && multisigDecoded.msig">
            <h2>{{ $t("pay.signatures") }} {{ showSignaturesCount }}</h2>
            <table class="w-100">
              <tr v-for="sig in multisigDecoded.msig.subsig" :key="sig">
                <th>
                  <span v-if="sig.s" class="badge bg-success">{{
                    encodeAddress(sig.pk)
                  }}</span>
                  <span v-if="!sig.s" class="badge bg-danger">{{
                    encodeAddress(sig.pk)
                  }}</span>
                </th>
                <td>
                  <span v-if="sig.s" class="badge bg-success">{{
                    $t("pay.signed")
                  }}</span
                  ><span v-if="!sig.s" class="badge bg-danger">{{
                    $t("pay.not_signed")
                  }}</span>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <input
          v-if="!isMultisig"
          class="btn btn-primary"
          type="submit"
          :value="$t('pay.process_payment')"
        />
        <span v-if="!rawSignedTxn">
          <input
            v-if="isMultisig && $route.name != 'PayFromWalletConnect'"
            class="btn btn-primary"
            type="submit"
            :value="$t('pay.create_multisig_proposal')"
          />

          <input
            v-if="$route.name != 'PayFromWalletConnect'"
            class="btn btn-light mx-2"
            :value="$t('global.go_back')"
            @click="page = 'design'"
          />
        </span>

        <JsonViewer
          v-if="
            txn &&
            $store &&
            $store.state &&
            $store.state.config &&
            $store.state.config.dev
          "
          :value="txn"
          copyable
          boxed
          sort
        />

        <div
          v-if="
            isMultisig && txn && accountFor2FA && !isSignedByAccountFor2FAAddr
          "
        >
          <h2>{{ $t("pay.2fa_code") }}</h2>
          <div v-if="accountFor2FAAuthToken">
            <div>
              <InputMask itemid="txtCode" v-model="txtCode" mask="999-999" />
            </div>
            <div>
              <button
                class="btn btn-primary my-2"
                :disabled="!txtCode || txtCode.indexOf('_') >= 0"
                @click="sign2FAClick"
              >
                {{ $t("pay.sign") }}
              </button>
            </div>
          </div>
          <div v-else>
            <button
              class="btn btn-primary my-2"
              @click="authorizePrimaryAccountClick"
            >
              {{ $t("pay.sign_arc14_request") }}
            </button>
          </div>
        </div>

        <div v-if="isMultisig && multisigDecoded.txn">
          <div v-if="accountsFromMultisig && accountsFromMultisig.length > 0">
            <h2>{{ $t("pay.sign_with") }}</h2>
            <select v-model="signMultisigWith" class="form-control" multiple>
              <option
                v-for="option in accountsFromMultisig"
                :key="option.addr"
                :value="option.addr"
              >
                {{ option.name + "  - " + option.addr }}
              </option>
            </select>
            <button
              class="btn btn-primary my-2"
              :disabled="signMultisigWith.length == 0"
              @click="signMultisig"
            >
              {{ $t("pay.sign") }}
            </button>
          </div>
          <div v-if="isSignedByAny && showFormSend">
            <h2>{{ $t("pay.send_to_other_signators") }}</h2>
            <textarea
              v-if="rawSignedTxn"
              v-model="rawSignedTxn"
              class="form-control my-2"
              rows="4"
            />
          </div>
          <div v-if="showFormCombine">
            <h2 v-if="rawSignedTxn">{{ $t("pay.combine_title") }}:</h2>
            <textarea
              v-if="rawSignedTxn"
              v-model="rawSignedTxnFriend"
              class="form-control my-2"
              rows="4"
            />
            <button
              v-if="rawSignedTxnFriend"
              class="btn btn-primary m-2"
              :disabled="!rawSignedTxn && !rawSignedTxnInput"
              @click="combineSignatures"
            >
              {{ $t("pay.combine_action") }}
            </button>
          </div>

          <button
            v-if="$route.name != 'PayFromWalletConnect'"
            class="btn btn-primary m-2"
            :disabled="!thresholdMet"
            @click="sendMultisig"
          >
            {{ $t("pay.send_to_network") }}
          </button>
          <button
            v-if="$route.name == 'PayFromWalletConnect'"
            class="btn btn-primary m-2"
            :disabled="!thresholdMet"
            @click="retToWalletConnect"
          >
            {{ $t("pay.return_to_wc") }}
          </button>
          <button
            v-if="isSignedByAny"
            class="btn btn-light m-2"
            @click="toggleShowFormSend"
          >
            {{ $t("pay.toggle_send_to_others_form") }}
          </button>
          <button class="btn btn-light m-2" @click="toggleShowFormCombine">
            {{ $t("pay.toggle_combine_with_others_form") }}
          </button>
        </div>

        <p v-if="!tx && processing" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          />
          {{ $t("pay.state_sending") }}
        </p>
        <p v-if="tx && !confirmedRound" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          />
          {{ $t("pay.state_sent") }}: {{ tx }}.
          {{ $t("pay.state_waiting_confirm") }}
        </p>
        <p v-if="confirmedRound" class="alert alert-success my-2">
          {{ $t("pay.state_confirmed") }} <b>{{ confirmedRound }}</b
          >. {{ $t("pay.transaction") }}: {{ tx }}.
        </p>
        <p v-if="error" class="alert alert-danger my-2">
          {{ $t("pay.error") }}: {{ error }}
        </p>
        <p v-if="$store.state.toast.lastError" class="alert alert-danger my-2">
          {{ $t("global.last_error") }}: {{ $store.state.toast.lastError }}
        </p>
      </form>
    </div>
  </main-layout>
</template>

<script>
import { QrcodeStream } from "qrcode-reader-vue3";
import aprotocol from "../shared/algorand-protocol-parse";
import MainLayout from "../layouts/Main.vue";
import InputMask from "primevue/inputmask";
import { mapActions } from "vuex";
import algosdk from "algosdk";
//import base64url from "base64url";
import { JsonViewer } from "vue3-json-viewer";

export default {
  components: {
    QrcodeStream,
    MainLayout,
    InputMask,
    JsonViewer,
  },
  data() {
    return {
      payFromDirect: "",
      genericaccount: false,
      genericaccountRekey: false,
      payamount: 0,
      fee: 0.001,
      payTo: "",
      rekeyTo: "",
      paynote: "",
      paynoteB64: false,
      page: "design",
      tx: "",
      processing: false,
      error: "",
      confirmation: null,
      confirmedRound: null,
      subpage: "",
      txn: null,
      rawSignedTxn: null,
      rawSignedTxnFriend: null,
      rawSignedTxnInput: null,
      signMultisigWith: [],
      multisigDecoded: {},
      assets: [],
      asset: "",
      assetObj: {},
      scan: false,
      forceAsset: false,
      txtCode: "",
      accountFor2FARealm: "",
      accountFor2FAAuthToken: "",
      showFormSend: false,
      showFormCombine: false,
    };
  },
  computed: {
    msigNote() {
      if (!this.multisigDecoded) return "";
      if (!this.multisigDecoded.txn) return "";
      if (!this.multisigDecoded.txn.note) return "";
      return Buffer.from(this.multisigDecoded.txn.note).toString("utf8");
    },
    isNotValid() {
      if (!this.payTo) return true;
      if (this.isRekey && !this.rekeyTo) return true;
      return false;
    },
    amountLong() {
      return Math.round(this.payamount * this.decimalsPower);
    },
    decimalsPower() {
      let decimals = 6;
      if (this.assetObj && this.assetObj.decimals !== undefined) {
        decimals = this.assetObj.decimals;
      }
      return Math.pow(10, decimals);
    },
    feeLong() {
      return this.fee * Math.pow(10, 6); // algo
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.payFrom
      );
    },
    isMultisig() {
      return !!this.multisigParams;
    },
    accountsFromMultisig() {
      const list = this.$store.state.wallet.privateAccounts.filter(
        (a) =>
          this.multisigParams.addrs.includes(a.addr) &&
          (!!a.sk || a.type == "ledger")
      );
      const nonSigned = list.filter(
        (s) =>
          !!this.multisigDecoded.msig.subsig.find(
            (a) => s.addr == algosdk.encodeAddress(a.pk) && !a.s
          )
      );

      return nonSigned;
    },
    accountFor2FA() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) =>
          this.multisigParams &&
          this.multisigParams.addrs &&
          this.multisigParams.addrs.includes(a.addr) &&
          a.type == "2faApi"
      );
    },
    accountFor2FAAddr() {
      if (!this.accountFor2FA) return "";
      return this.accountFor2FA.addr;
    },
    isSignedByAccountFor2FAAddr() {
      if (!this.accountFor2FA) return false;
      if (!this.multisigDecoded) return false;
      if (!this.multisigDecoded.msig) return false;
      if (!this.multisigDecoded.msig.subsig) return false;
      const sig = this.multisigDecoded.msig.subsig.find(
        (s) => algosdk.encodeAddress(s.pk) == this.accountFor2FAAddr
      );
      if (!sig) return false;

      return !!sig.s;
    },
    accountFor2FAAddrPrimary() {
      if (!this.accountFor2FA) return "";
      return this.accountFor2FA.primaryAccount;
    },
    accountFor2FAProvider() {
      if (!this.accountFor2FA) return "";
      return this.accountFor2FA.twoFactorAuthProvider;
    },
    showDesignScreen() {
      return (
        !this.isMultisig || (this.isMultisig && this.subpage == "proposal")
      );
    },
    payFrom() {
      if (this.$route.params.account) return this.$route.params.account;
      return this.payFromDirect;
    },
    isRekey() {
      if (
        this.multisigDecoded &&
        this.multisigDecoded.txn &&
        this.multisigDecoded.reKeyTo
      )
        return true;
      return this.$route.params.type == "rekey";
    },
    selectedAssetFromAccount() {
      return this.account["assets"].find((a) => a["asset-id"] == this.asset);
    },
    maxAmount() {
      if (!this.account) return 0;

      if (this.asset) {
        if (!this.selectedAssetFromAccount) return 0;
        return this.selectedAssetFromAccount.amount / this.decimalsPower;
      } else {
        let ret = this.account.amount / 1000000 - 0.1;
        ret = ret - this.fee;
        if (this.account["assets"] && this.account["assets"].length > 0)
          ret = ret - this.account["assets"].length * 0.1;
        return ret;
      }
    },
    payamountGtMaxAmount() {
      return this.payamount > this.maxAmount;
    },
    forcedAssetNotLoaded() {
      return this.forceAsset && (!this.assetObj || !this.assetObj.name);
    },
    stepAmount() {
      if (!this.asset) return 0.000001;
      if (!this.account) return 0.000001;
      if (!this.assetObj || this.assetObj.decimals === undefined)
        return 0.000001;
      return Math.pow(10, -1 * this.assetObj.decimals);
    },
    noteIsB64() {
      if (!this.paynote) return false;
      return this.isBase64(this.paynote);
    },
    assetUnit() {
      if (!this.assetObj) return "";
      if (!this.assetObj["unit-name"]) return "";
      return this.assetObj["unit-name"];
    },
    isAuth() {
      return this.$store.state.wallet.isOpen;
    },
    malformedAddress() {
      if (
        this.multisigDecoded &&
        this.multisigDecoded.txn &&
        this.multisigDecoded.txn.type &&
        (this.multisigDecoded.txn.type == "appl" ||
          this.multisigDecoded.txn.type == "acfg")
      ) {
        return false;
      }
      if (
        this.txn &&
        this.txn &&
        this.txn.type &&
        (this.txn.type == "appl" || this.txn.type == "acfg")
      ) {
        return false;
      }
      return !algosdk.isValidAddress(this.payTo);
    },
    rekeyedToInfo() {
      if (!this.account) return;
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.account.rekeyedTo
      );
    },
    multisigParams() {
      if (this.rekeyedToInfo) return this.rekeyedMultisigParams;
      return this.account.params;
    },
    rekeyedMultisigParams() {
      if (!this.account) return;
      const rekeyedInfo = this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.account.rekeyedTo
      );
      if (!rekeyedInfo) return;
      return rekeyedInfo.params;
    },
    showSignaturesCount() {
      return `${
        this.multisigDecoded.msig.subsig.filter((s) => !!s.s).length
      } / ${this.multisigDecoded.msig.thr}`;
    },
    isSignedByAny() {
      if (!this.multisigDecoded) return false;
      if (!this.multisigDecoded.msig) return false;
      if (!this.multisigDecoded.msig.subsig) return false;
      return this.multisigDecoded.msig.subsig.filter((s) => !!s.s).length > 0;
    },
    thresholdMet() {
      if (!this.multisigDecoded) return false;
      if (!this.multisigDecoded.msig) return false;
      if (!this.multisigDecoded.msig.subsig) return false;
      return (
        this.multisigDecoded.msig.subsig.filter((s) => !!s.s).length >=
        this.multisigDecoded.msig.thr
      );
    },
  },
  watch: {
    payFromDirect() {
      if (this.payFromDirect) {
        this.lastActiveAccount({ addr: this.payFromDirect });
      }
    },
    account() {
      this.makeAssets();
    },
    async asset() {
      if (!this.asset) {
        this.assetObj = {
          "asset-id": undefined,
          name: this.$store.state.config.tokenSymbol,
          "unit-name": this.$store.state.config.tokenSymbol,
          decimals: 6,
        };
      } else {
        this.assetObj = await this.getAsset({
          assetIndex: this.asset,
        });
      }
      this.payamount = 0;
      if (this.$route.params.toAccount) {
        this.parseToAccount();
      }
    },
    isAuth() {
      if (this.isAuth) {
        if (
          this.$store.state.wallet.privateAccounts &&
          this.$store.state.wallet.privateAccounts.length == 1
        ) {
          this.payFromDirect = this.$store.state.wallet.privateAccounts[0].addr;
        }
      }
    },
  },
  async mounted() {
    if (!this.payFrom) {
      this.setNoRedirect();
    }
    this.resetError();
    this.payTo = this.$store.state.wallet.lastpayTo;

    if (this.$route.params.toAccount) {
      this.parseToAccount();
    }
    if (this.$route.name == "PayFromWalletConnect") {
      try {
        this.txn = this.$store.state.signer.toSign;

        if (this.txn.to) {
          this.payTo = algosdk.encodeAddress(this.txn.to.publicKey);
        }
        this.payFromDirect = algosdk.encodeAddress(this.txn.from.publicKey);

        const rawSignedTxn = await this.signerCreateMultisigTransaction({
          txn: this.txn,
          from: this.payFrom,
        });
        this.rawSignedTxn = this._arrayBufferToBase64(rawSignedTxn);
        this.rawSignedTxnInput = this.rawSignedTxn;

        this.multisigDecoded = algosdk.decodeSignedTransaction(
          this._base64ToArrayBuffer(this.rawSignedTxnInput)
        );
        this.note = this.txn.note;
        this.asset = this.txn.assetIndex;
        this.page = "review";
      } catch (e) {
        console.error("Input is not valid base64-url format ", e);
      }
    }
    if (this.$route.params.rawSignedTxnInput) {
      try {
        const encoded = this.$route.params.rawSignedTxnInput;
        const b64 = this.base64url2base64(encoded);
        const uint8buffer = this._base64ToArrayBuffer(b64);

        this.txn = algosdk.decodeUnsignedTransaction(uint8buffer);
        if (this.txn.to) {
          this.payTo = algosdk.encodeAddress(this.txn.to.publicKey);
        }
        this.note = this.txn.note;
        this.asset = this.txn.assetIndex;
        this.page = "review";
      } catch (e) {
        console.error("Input is not valid base64-url format ", e);
      }
    }
    if (this.$route.params.account) {
      this.lastActiveAccount({ addr: this.$route.params.account });
    }
    await this.makeAssets();

    if (
      this.$store.state.wallet.privateAccounts &&
      this.$store.state.wallet.privateAccounts.length == 1
    ) {
      this.payFromDirect = this.$store.state.wallet.privateAccounts[0].addr;
    }

    if (this.isRekey && this.account && this.account.addr) {
      // if is rekey, make self tx
      this.payTo = this.account.addr;
    }
    if (this.payTo && !this.payFromDirect) {
      this.payFromDirect = this.payTo;
    }

    if (this.accountFor2FAProvider) {
      try {
        this.accountFor2FARealm = await this.getRealm({
          twoFactorAuthProvider: this.accountFor2FAProvider,
        });
        this.loadAuthToken();
      } catch (err) {
        const error = err.message ?? err;
        console.error("failed to request realm", error, err);
        await this.openError(error);
      }
    }
  },
  methods: {
    ...mapActions({
      setNoRedirect: "config/setNoRedirect",
      prolong: "wallet/prolong",
      makePayment: "algod/makePayment",
      waitForConfirmation: "algod/waitForConfirmation",
      preparePayment: "algod/preparePayment",
      lastActiveAccount: "wallet/lastActiveAccount",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      updateAccount: "wallet/updateAccount",
      getSK: "wallet/getSK",
      getAsset: "indexer/getAsset",
      setEnv: "config/setEnv",
      openSuccess: "toast/openSuccess",
      openError: "toast/openError",
      signerSignMultisig: "signer/signMultisig",
      signerCreateMultisigTransaction: "signer/createMultisigTransaction",
      signerSetSigned: "signer/setSigned",
      signAuthTx: "arc14/signAuthTx",
      getRealm: "fa2/getRealm",
      signTwoFactor: "fa2/signTwoFactor",
      resetError: "toast/resetError",
    }),
    isBase64(str) {
      try {
        const decoded1 = Buffer.from(str, "base64").toString("utf8");
        const encoded2 = Buffer.from(decoded1, "binary").toString("base64");
        return str == encoded2;
      } catch {
        return false;
      }
    },
    async makeAssets() {
      this.assets = [];
      if (this.account) {
        this.assets.push({
          "asset-id": "",
          amount: this.account.amount,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": "",
        });
      } else {
        this.assets.push({
          "asset-id": "",
          amount: 0,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": "",
        });
      }
      if (this.isRekey) return;
      if (this.account) {
        for (let index in this.account.assets) {
          const asset = await this.getAsset({
            assetIndex: this.account.assets[index]["asset-id"],
          });
          if (asset) {
            this.assets.push({
              "asset-id": this.account.assets[index]["asset-id"],
              amount: this.account.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
            });
          } else {
            console.error(
              "Asset not loaded",
              this.account.assets[index]["asset-id"]
            );
          }
        }
      }

      if (this.$route.params.toAccount) {
        this.parseToAccount();
      }
    },
    reset() {
      this.subpage = "";
      this.error = "";
      this.confirmedRound = "";
      this.processing = true;
      this.page = "review";
      this.signMultisigWith = [];
      this.rawSignedTxn = "";
      this.rawSignedTxnInput = "";
    },
    parseToAccount() {
      this.b64decode = aprotocol.parseAlgorandProtocolParameters(
        this.$route.params.toAccount
      );
      this.payTo = this.b64decode.payTo;
      this.payTo = this.payTo.replace(/[^\w\s]/gi, "");
      this.payamount = this.b64decode.payamountbase / this.decimalsPower;
      if (this.b64decode.asset) {
        this.asset = this.b64decode.asset;
        this.forceAsset = true;
      }
      if (this.b64decode.paynote) {
        this.paynote = this.b64decode.paynote;
      }
      if (this.b64decode.fee) {
        this.fee = this.b64decode.fee;
      }
      if (this.b64decode.network != this.$store.state.config.env) {
        this.setEnv({ env: this.b64decode.network });
      }
    },
    previewPaymentClick(e) {
      this.page = "review";
      this.error = "";
      this.confirmedRound = "";
      this.tx = null;

      this.processing = false;
      this.prolong();
      e.preventDefault();
    },
    async payMultisig() {
      this.prolong();
      const enc = new TextEncoder();
      const note = enc.encode(this.paynote);
      if (!this.txn) {
        const data = {
          payTo: this.payTo,
          payFrom: this.payFrom,
          amount: this.amountLong,
          noteEnc: note,
          fee: 1000,
          asset: this.assetObj["asset-id"],
        };
        if (this.rekeyTo) {
          data.reKeyTo = this.rekeyTo;
        }
        this.txn = await this.preparePayment(data);
      }
      const rawSignedTxn = algosdk.createMultisigTransaction(
        this.txn,
        this.multisigParams
      );
      this.rawSignedTxn = this._arrayBufferToBase64(rawSignedTxn);
      this.rawSignedTxnInput = this.rawSignedTxn;

      this.multisigDecoded = algosdk.decodeSignedTransaction(
        this._base64ToArrayBuffer(this.rawSignedTxnInput)
      );
      //let txId = txn.txID().toString();
    },
    async signMultisig(e) {
      this.prolong();
      e.preventDefault();
      let rawSignedTxn = null;
      if (this.rawSignedTxnInput) {
        rawSignedTxn = this._base64ToArrayBuffer(this.rawSignedTxnInput);
      }
      const selected = Object.values(this.signMultisigWith);
      if (
        this.multisigParams &&
        typeof this.multisigParams.threshold === "string"
      ) {
        this.multisigParams.threshold = parseInt(this.multisigParams.threshold);
      }
      if (rawSignedTxn == null) {
        rawSignedTxn = await this.signerCreateMultisigTransaction({
          txn: this.txn,
          from: this.payFrom,
        });
      }
      for (const acc in this.accountsFromMultisig) {
        try {
          if (!this.accountsFromMultisig[acc]) continue;
          if (!selected.includes(this.accountsFromMultisig[acc].addr)) {
            continue;
          }
          const newTx = await this.signerSignMultisig({
            msigTx: rawSignedTxn,
            signator: this.accountsFromMultisig[acc].addr,
            txn: this.txn,
          });
          await this.addSignature(newTx);
        } catch (e) {
          this.openError(e.message ?? e);
        }
      }
    },
    _arrayBufferToBase64(buffer) {
      var binary = "";
      var bytes = new Uint8Array(buffer);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    _base64ToArrayBuffer(base64) {
      var binary_string = window.atob(base64);
      var len = binary_string.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
    },
    base64url2base64(input) {
      // Replace non-url compatible chars with base64 standard chars
      input = input.replace(/-/g, "+").replace(/_/g, "/");

      // Pad out with standard base64 required padding characters
      var pad = input.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error(
            "InvalidLengthError: Input base64url string is the wrong length to determine padding"
          );
        }
        input += new Array(5 - pad).join("=");
      }

      return input;
    },
    base642base64url(input) {
      return input.replace("+", "-").replace("/", "_").replace("=", "");
    },

    async payPaymentClick(e) {
      this.prolong();
      e.preventDefault();
      try {
        if (this.isMultisig) return this.payMultisig();
        this.reset();
        this.prolong();
        const payTo = this.payTo;
        const payFrom = this.payFrom;
        const amount = this.amountLong;
        const note = this.paynote;
        let fee = this.feeLong;
        const asset = this.asset;

        const enc = new TextEncoder();
        let noteEnc = enc.encode(note);
        if (this.paynoteB64) {
          try {
            noteEnc = Uint8Array.from(this._base64ToArrayBuffer(this.paynote));
            if (!noteEnc) {
              noteEnc = enc.encode(note);
            }
          } catch (e) {
            console.error("Error converting b64 to array");
          }
        }
        if (!this.isRekey) this.rekeyTo = undefined;
        this.tx = await this.makePayment({
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
          reKeyTo: this.rekeyTo,
        });
        if (!this.tx) {
          console.error("this.makePayment has failed");
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          //            "Payment has probably not reached the network. Are you offline? Please check you account";

          const search = "should have been authorized by ";
          if (
            this.$store.state.toast.lastError &&
            this.$store.state.toast.lastError.indexOf(search) > 0
          ) {
            let rekeyIndex = this.$store.state.toast.lastError.indexOf(search);
            const msg = this.$store.state.toast.lastError.substring(
              rekeyIndex + search.length
            );
            let rekeyIndexAddress = msg.indexOf(" ");
            if (rekeyIndexAddress > 0) {
              const rekeyedTo = msg.substring(0, rekeyIndexAddress);
              const info = {};
              info.address = this.payFrom;
              info.rekeyedTo = rekeyedTo;
              await this.updateAccount({ info });
              await this.openSuccess(
                `Information about rekeying to address ${rekeyedTo} has been stored`
              );
            }
          }
          return;
        }
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          console.error(`confirmation not received for this.tx`);
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          //            "Payment has probably not reached the network. Are you offline? Please check you account";
          return;
        }
        if (confirmation["confirmed-round"]) {
          this.processing = false;
          this.confirmedRound = confirmation["confirmed-round"];

          if (this.rekeyTo) {
            const info = {};
            info.address = this.payFrom;
            info.rekeyedTo = this.rekeyTo;
            await this.updateAccount({ info });
            await this.openSuccess(
              `Information about rekeying to address ${this.rekeyTo} has been stored`
            );
          }
        }
        if (confirmation["pool-error"]) {
          this.processing = false;
          this.error = confirmation["pool-error"];
        }
      } catch (exc) {
        this.error = exc;
      }
    },
    loadMultisig(e) {
      this.prolong();
      if (e) {
        e.preventDefault();
      }
      this.multisigDecoded = algosdk.decodeSignedTransaction(
        this._base64ToArrayBuffer(this.rawSignedTxnInput)
      );
      this.txn = this.multisigDecoded.txn;
      this.rawSignedTxn = this.rawSignedTxnInput;
      this.page = "review";
      if (
        this.multisigDecoded &&
        this.multisigDecoded.msig &&
        typeof this.multisigDecoded.msig.thr === "string"
      ) {
        this.multisigDecoded.msig.thr = parseInt(this.multisigDecoded.msig.thr);
      }
    },
    encodeAddress(a) {
      return algosdk.encodeAddress(a);
    },
    async sendMultisig(e) {
      this.prolong();
      this.error = "";

      this.processing = true;
      try {
        e.preventDefault();
        const signedTxn = this._base64ToArrayBuffer(this.rawSignedTxn);
        let error = "";
        try {
          const transaction = await this.sendRawTransaction({ signedTxn });
          this.tx = transaction.txId;
        } catch (e) {
          await this.openError(e.message);
          console.error(e);
          error = e.message;
        }
        if (!this.tx) {
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          // "Payment has probably not reached the network. Are you offline? Please check you account";

          const search = "should have been authorized by ";
          if (error && error.indexOf(search) > 0) {
            let rekeyIndex = error.indexOf(search);
            const msg = error.substring(rekeyIndex + search.length);
            let rekeyIndexAddress = msg.indexOf(" ");
            if (rekeyIndexAddress > 0) {
              const rekeyedTo = msg.substring(0, rekeyIndexAddress);
              const info = {};
              info.address = this.payFrom;
              info.rekeyedTo = rekeyedTo;
              await this.updateAccount({ info });
              await this.openSuccess(
                `Information about rekeying to address ${rekeyedTo} has been stored`
              );
            }
          }
          return;
        }
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (confirmation["confirmed-round"]) {
          this.processing = false;
          this.confirmedRound = confirmation["confirmed-round"];
        }
        if (confirmation["pool-error"]) {
          this.processing = false;
          this.error = confirmation["pool-error"];
        }
      } catch (e) {
        this.processing = false;
        this.error = e;
      }
    },
    toggleCamera(e) {
      e.preventDefault();
      this.scan = !this.scan;
      if (this.scan) {
        this.payTo = "";
      }
    },
    test(e) {
      e.preventDefault();
      const tests = [
        "015LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U",
        "algorand://025LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=123",
        "algorand://035LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=234&&",
        "algorand://045LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?xnote=345&fee=3&amount=1000&asset=456",
        "algorand://046LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?note=SGVsbG8=&noteB64=1&fee=0.001&amount=1",
      ];
      for (let index in tests) {
        this.onDecodeQR(tests[index]);
      }
    },
    isEncoded(uri) {
      uri = uri || "";
      return uri !== decodeURIComponent(uri);
    },
    onDecodeQR(result) {
      if (this.scan && result) {
        if (
          result.startsWith("algorand://") ||
          result.startsWith("web+algorand://")
        ) {
          // parse according to https://github.com/emg110/algorand-qrcode
          result = result.replace("web+algorand://", "");
          result = result.replace("algorand://", "");
          const qIndex = result.indexOf("?");
          if (qIndex < 0) {
            this.payTo = result;
            this.payTo = this.payTo.replace(/[^\w\s]/gi, "");
          } else {
            this.payTo = result.substring(0, qIndex);
            this.payTo = this.payTo.replace(/[^\w\s]/gi, "");

            const params = result.substring(qIndex + 1);
            const paramsArr = params.split("&");

            let note = undefined;
            let noteB64 = undefined;
            let amount = undefined;
            let decimals = undefined;
            let asset = undefined;
            let fee = undefined;

            for (const index in paramsArr) {
              const eqIndex = paramsArr[index].indexOf("=");
              if (eqIndex > 0) {
                // valid parameter names starts with letters
                const paramName = paramsArr[index].substring(0, eqIndex);
                const paramValue = paramsArr[index].substring(eqIndex + 1);
                switch (paramName) {
                  case "note":
                  case "xnote":
                  case "label":
                    note = paramValue;
                    break;
                  case "noteB64":
                    noteB64 = paramValue;
                    break;
                  case "amount":
                    amount = paramValue;
                    break;
                  case "asset":
                    asset = paramValue;
                    break;
                  case "fee":
                    fee = paramValue;
                    break;
                }
              }
            }

            this.paynote = note;
            if (this.isEncoded(this.paynote)) {
              this.paynote = decodeURIComponent(this.paynote);
            }

            this.paynoteB64 = !!noteB64;
            if (decimals !== undefined) {
              if (amount) {
                this.payamount = amount / Math.pow(10, decimals);
              }
              if (fee) {
                this.fee = fee / Math.pow(10, decimals);
              }
            } else {
              if (amount) {
                this.payamount = amount;
              }
              if (fee) {
                this.fee = fee;
              }
            }
            if (asset) {
              this.asset = asset;
            }
          }
        } else {
          this.payTo = result;
          this.payTo = this.payTo.replace(/[^\w\s]/gi, "");
        }
      }
      if (this.payTo) {
        this.scan = false;
      }
    },
    setMaxAmount(e) {
      e.preventDefault();
      this.payamount = this.maxAmount;
    },
    async addSignature(base64Tx) {
      if (!base64Tx) return;
      const tx1 = new Uint8Array(Buffer.from(this.rawSignedTxn, "base64"));
      const tx2 = new Uint8Array(Buffer.from(base64Tx, "base64"));
      const merged = algosdk.mergeMultisigTransactions([tx1, tx2]);
      this.rawSignedTxn = Buffer.from(merged).toString("base64");
      this.multisigDecoded = algosdk.decodeSignedTransaction(
        this._base64ToArrayBuffer(this.rawSignedTxn)
      );
      await this.signerSetSigned({ signed: merged });
    },
    async combineSignatures(e) {
      this.prolong();
      e.preventDefault();
      try {
        await this.addSignature(this.rawSignedTxnFriend);
        this.showFormCombine = false;
      } catch (e) {
        this.openError(e.message);
      }
    },
    retToWalletConnect() {
      this.$router.push({ name: "Connect" });
    },
    async sign2FAClick(e) {
      try {
        this.prolong();
        e.preventDefault();
        const newTx = await this.signTwoFactor({
          rawSignedTxnInput: this.rawSignedTxnInput,
          secondaryAccount: this.accountFor2FA.recoveryAccount,
          txtCode: this.txtCode,
          authToken: this.accountFor2FAAuthToken,
          twoFactorAuthProvider: this.accountFor2FAProvider,
        });
        await this.addSignature(newTx);
      } catch (err) {
        const error = err.message ?? err;
        console.error("failed to sign 2fa tx", error, err);
        await this.openError(error);
      }
    },
    loadAuthToken() {
      if (!this.accountFor2FARealm) return false;
      if (!this.$store.state.arc14.address2chain2realm2token) return false;
      if (
        !this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ]
      )
        return false;
      if (
        !this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ][this.accountFor2FAAddr]
      )
        return false;
      if (
        !this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ][this.accountFor2FAAddr][this.accountFor2FARealm]
      )
        return false;
      var token =
        this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ][this.accountFor2FAAddr][this.accountFor2FARealm];
      this.accountFor2FAAuthToken = token;
    },

    async authorizePrimaryAccountClick(e) {
      this.prolong();
      e.preventDefault();
      this.accountFor2FAAuthToken = await this.signAuthTx({
        account: this.accountFor2FAAddrPrimary,
        realm: this.accountFor2FARealm,
      });
    },
    toggleShowFormSend(e) {
      this.prolong();
      e.preventDefault();
      this.showFormSend = !this.showFormSend;
    },
    toggleShowFormCombine(e) {
      this.prolong();
      e.preventDefault();
      this.showFormCombine = !this.showFormCombine;
    },
  },
};
</script>

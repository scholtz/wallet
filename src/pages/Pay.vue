<template>
  <main-layout>
    <div v-if="!$route.params.account">
      <h1>{{ $t("pay.select_account_for_payment") }}</h1>

      <Card>
        <template #content>
          <SelectAccount v-model="payFromDirect" class="w-full"></SelectAccount>
        </template>
      </Card>
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

        <Card>
          <template #content>
            <Message severity="error" v-if="isRekey" class="my-2">
              {{ $t("pay.rekey_warning") }}
            </Message>
            <p>{{ $t("pay.selected_account") }}: {{ account.addr }}</p>
            <div v-if="isMultisig && !subpage">
              <h2>{{ $t("pay.multisig_account") }}</h2>
              <Button class="my-2" @click="this.subpage = 'proposal'">
                {{ $t("pay.create_proposal") }}
              </Button>
              <Button class="m-2" @click="subpage = 'sign'">
                {{ $t("pay.sign_proposal") }}
              </Button>
            </div>
            <div v-if="subpage == 'sign'" class="grid">
              <div class="col-12">
                <div class="field grid">
                  <label
                    for="rawSignedTxnInput"
                    class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
                  >
                    {{ $t("pay.signature_from_friend") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <Textarea
                      id="rawSignedTxnInput"
                      v-model="rawSignedTxnInput"
                      class="w-full"
                      rows="8"
                    />
                  </div>
                </div>
                <div class="field grid">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Button class="my-2" @click="loadMultisig">
                      {{ $t("pay.load_multisig_data") }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="showDesignScreen" class="grid">
              <div :class="scan ? 'col-8' : 'col-12'">
                <div v-if="$route.params.toAccount">
                  <InputText
                    v-if="!payTo"
                    id="payTo1"
                    v-model="$route.params.toAccount"
                    disabled
                    class="w-full"
                  />
                  <InputText
                    v-else
                    id="payTo2"
                    v-model="payTo"
                    disabled
                    class="w-full"
                  />
                </div>
                <div v-else>
                  <div v-if="!isRekey" class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ $t("pay.pay_to") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <TabView class="w-full" header-class="mr-2">
                        <TabPanel
                          :header="$t('pay.pay_to_wallet')"
                          headerClass="mr-2"
                        >
                          <SelectAccount
                            v-model="payTo"
                            class="w-full"
                          ></SelectAccount>
                        </TabPanel>
                        <TabPanel :header="$t('pay.pay_to_other')">
                          <InputText
                            id="payTo"
                            v-model="payTo"
                            class="w-full"
                          />
                          <div>
                            <Button
                              size="small"
                              class="m-2"
                              @click="toggleCamera"
                            >
                              {{ $t("pay.toggle_camera") }}
                            </Button>
                            <p>
                              {{ $t("pay.store_other_help") }}
                            </p>
                          </div>
                        </TabPanel>
                      </TabView>
                    </div>
                  </div>
                  <Message
                    severity="error"
                    v-if="forcedAssetNotLoaded"
                    class="my-2"
                  >
                    {{ $t("pay.asset_failed_to_load") }}
                  </Message>
                </div>
                <div class="field grid" v-if="isRekey">
                  <label class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ $t("pay.rekey_to") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <TabView>
                      <TabPanel
                        :header="$t('pay.rekey_to_wallet_account')"
                        class="mr-2"
                      >
                        <SelectAccount
                          v-model="rekeyTo"
                          class="w-full"
                        ></SelectAccount>
                      </TabPanel>
                      <TabPanel :header="$t('pay.rekey_to_external_account')">
                        <InputText
                          id="rekeyTo"
                          v-model="rekeyTo"
                          class="w-full"
                        />
                        <div>
                          <Button
                            size="small"
                            class="m-2"
                            @click="toggleCamera"
                          >
                            {{ $t("pay.toggle_camera") }}
                          </Button>
                          <p>
                            {{ $t("pay.store_other_help") }}
                          </p>
                        </div>
                      </TabPanel>
                    </TabView>
                  </div>
                </div>
                <div>
                  <div
                    class="field grid"
                    v-if="forceAsset && assetObj && assetObj.name"
                  >
                    <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ $t("pay.asset") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <InputText
                        v-model="assetObj.name"
                        class="w-full"
                        disabled
                      />
                    </div>
                  </div>
                  <div class="field grid" v-else>
                    <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ $t("pay.asset") }}
                    </label>

                    <div class="col-12 md:col-10">
                      <Dropdown
                        inputId="asset"
                        v-model="asset"
                        filter
                        :options="assets"
                        optionLabel="label"
                        optionValue="asset-id"
                        :placeholder="$t('pay.asset')"
                        class="w-full"
                        inputClass="w-full"
                      >
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <Message
                  severity="error"
                  v-if="payamountGtMaxAmount"
                  class="my-2"
                >
                  {{ $t("pay.asset_too_small_balance") }}
                </Message>
                <div v-if="!isRekey" class="field grid">
                  <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ $t("pay.amount") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputGroup>
                      <InputNumber
                        itemId="payamount"
                        v-model="payamount"
                        :min="0"
                        :max="maxAmount"
                        :step="stepAmount"
                        :maxFractionDigits="decimals"
                        showButtons
                        class="w-full"
                      />
                      <InputGroupAddon v-if="assetUnit">
                        {{ assetUnit }}
                      </InputGroupAddon>
                      <Button
                        severity="secondary"
                        class="col-2"
                        @click="setMaxAmount"
                      >
                        {{ $t("pay.set_max") }}
                      </Button>
                    </InputGroup>
                  </div>
                </div>
                <div class="field grid">
                  <label for="fee" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ $t("pay.fee") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputGroup>
                      <InputNumber
                        inputId="fee"
                        v-model="fee"
                        :min="0.001"
                        :max="1"
                        :step="0.000001"
                        :maxFractionDigits="6"
                        class="w-full"
                        showButtons
                      />
                      <InputGroupAddon>
                        {{ this.$store.state.config.tokenSymbol }}
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                </div>
                <div class="field grid">
                  <label for="paynote" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ $t("pay.note") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputText id="paynote" v-model="paynote" class="w-full" />
                  </div>
                </div>

                <div class="field grid" v-if="noteIsB64">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Checkbox
                      inputId="paynoteB64"
                      v-model="paynoteB64"
                      class="mr-2"
                    />
                    <label class="form-check-label" for="paynoteB64">
                      {{ $t("pay.note_is_b64") }}
                    </label>
                  </div>
                </div>

                <div class="field grid">
                  <label for="env" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ $t("pay.environment") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputText
                      id="env"
                      :value="$store.state.config.env"
                      class="w-full"
                      disabled
                    />
                  </div>
                </div>
                <div class="field grid">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Button
                      :disabled="isNotValid"
                      class="my-2"
                      @click="previewPaymentClick"
                    >
                      {{ $t("pay.review_payment") }}
                    </Button>
                    <Button
                      v-if="isMultisig"
                      severity="secondary"
                      class="m-2"
                      value="Cancel"
                      @click="subpage = ''"
                    >
                      {{ $t("global.cancel") }}
                    </Button>
                    <Button
                      v-if="!isMultisig"
                      severity="secondary"
                      class="m-2"
                      value="Cancel"
                      @click="$router.push('/accounts')"
                    >
                      {{ $t("global.cancel") }}
                    </Button>
                  </div>
                </div>
              </div>

              <div v-if="scan" class="col-4">
                <QrcodeStream @decode="onDecodeQR" />
              </div>
            </div>
          </template>
        </Card>
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
import SelectAccount from "../components/SelectAccount.vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import AlgorandAddress from "../components/AlgorandAddress.vue";
import MultiSelect from "primevue/multiselect";
import Contract from "arc200js";
import { getArc200Client } from "arc200-client";

export default {
  components: {
    QrcodeStream,
    MainLayout,
    InputMask,
    JsonViewer,
    SelectAccount,
    TabView,
    TabPanel,
    AlgorandAddress,
    MultiSelect,
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
    decimals() {
      if (this.assetData) {
        return this.assetData.decimals;
      }
      let decimals = 6;
      if (this.assetObj && this.assetObj.decimals !== undefined) {
        decimals = this.assetObj.decimals;
      }
      return decimals;
    },
    decimalsPower() {
      return Math.pow(10, this.decimals);
    },
    feeLong() {
      return this.fee * Math.pow(10, 6); // algo
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.payFrom
      );
    },
    accountData() {
      if (!this.account) return false;
      if (!this.account.data) return false;
      return this.account.data[this.$store.state.config.env];
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
      return this.accountData["assets"].find(
        (a) => a["asset-id"] == this.asset
      );
    },
    assetData() {
      return this.assets.find((a) => a["asset-id"] == this.asset);
    },
    maxAmount() {
      if (!this.accountData) return 0;
      if (!this.assetData) return 0;

      if (this.assetData.type == "ARC200") {
        if (!this.assetData) return 0;
        return this.assetData.amount / 10 ** this.assetData.decimals;
      } else if (this.assetData.type == "ASA") {
        if (!this.assetData) return 0;
        return this.assetData.amount / 10 ** this.assetData.decimals;
      } else {
        let ret = this.accountData.amount / 1000000 - 0.1;
        ret = ret - this.fee;
        if (this.accountData["assets"] && this.accountData["assets"].length > 0)
          ret = ret - this.accountData["assets"].length * 0.1;
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
      if (!this.decimals) return 1;
      return Math.pow(10, -1 * this.decimals);
    },
    noteIsB64() {
      if (!this.paynote) return false;
      return this.isBase64(this.paynote);
    },
    assetUnit() {
      if (!this.assetObj) return "";
      if (!this.assetObj["unit-name"]) return this.assetObj.name;
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
      if (!this.accountData) return;
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.accountData.rekeyedTo
      );
    },
    multisigParams() {
      if (this.rekeyedToInfo) return this.rekeyedMultisigParams;
      return this.account.params;
    },
    rekeyedMultisigParams() {
      if (!this.accountData) return;
      const rekeyedInfo = this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.accountData.rekeyedTo
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
      if (this.asset > 0) {
        this.assetObj = await this.getAsset({
          assetIndex: this.asset,
        });
      } else {
        this.assetObj = {
          "asset-id": 0,
          name: this.$store.state.config.tokenSymbol,
          "unit-name": this.$store.state.config.tokenSymbol,
          decimals: 6,
        };
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

    if (this.$route.params.asset) {
      this.asset = this.$route.params.asset;
    }

    if (this.$route.params.toAccount) {
      this.parseToAccount();
    }
    if (this.$route.params.toAccountDirect) {
      this.payTo = this.$route.params.toAccountDirect;
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

        const b64Url = this.base642base64url(rawSignedTxn);
        this.$router.push(`/sign/${this.payFrom}/` + b64Url);
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
        this.$router.push(
          `/sign/${this.payFrom}/` +
            this.base642base64url(this.$route.params.rawSignedTxnInput)
        );
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

    if (this.isRekey && this.accountData && this.accountData.addr) {
      // if is rekey, make self tx
      this.payTo = this.accountData.addr;
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
      getAlgod: "algod/getAlgod",
      getIndexer: "indexer/getIndexer",
      signerToSignArray: "signer/toSignArray",
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
      if (this.accountData) {
        const balance = this.$filters.formatCurrency(
          this.accountData.amount,
          this.$store.state.config.tokenSymbol,
          6
        );
        this.assets.push({
          "asset-id": "0",
          amount: this.accountData.amount,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": this.$store.state.config.tokenSymbol,
          type: "Native",
          label: `${this.$store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
        });
      } else {
        const balance = this.$filters.formatCurrency(
          0,
          this.$store.state.config.tokenSymbol,
          6
        );
        this.assets.push({
          "asset-id": "0",
          amount: 0,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": this.$store.state.config.tokenSymbol,
          type: "Native",
          label: `${this.$store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
        });
      }
      if (this.isRekey) return; // if we do rekey tx, it is fixed asset - native token
      if (this.accountData) {
        for (let index in this.accountData.assets) {
          const asset = await this.getAsset({
            assetIndex: this.accountData.assets[index]["asset-id"],
          });
          if (asset) {
            const balance = this.$filters.formatCurrency(
              this.accountData.assets[index]["amount"],
              asset["unit-name"] ? asset["unit-name"] : asset["name"],
              asset["decimals"]
            );
            this.assets.push({
              "asset-id": this.accountData.assets[index]["asset-id"],
              amount: this.accountData.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
              type: "ASA",
              label: `${asset["name"]} (ASA ${this.accountData.assets[index]["asset-id"]}) Balance: ${balance}`,
            });
          } else {
            console.error(
              "Asset not loaded",
              this.accountData.assets[index]["asset-id"]
            );
          }
        }

        if (this.accountData.arc200) {
          for (const accountAsset of Object.values(this.accountData.arc200)) {
            const balance = this.$filters.formatCurrency(
              accountAsset.balance,
              accountAsset.symbol ? accountAsset.symbol : accountAsset.name,
              accountAsset.decimals
            );
            this.assets.push({
              "asset-id": Number(accountAsset.arc200id),
              amount: Number(accountAsset.balance),
              name: accountAsset.name,
              decimals: Number(accountAsset.decimals),
              "unit-name": accountAsset.symbol,
              type: "ARC200",
              label: `${accountAsset.name} (ARC200 ${accountAsset.arc200id}) Balance: ${balance}`,
            });
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
    async previewPaymentClick(e) {
      try {
        const asset = this.assets.find((a) => a["asset-id"] == this.asset);
        if (!asset) {
          console.error("no asset selected");
          return;
        }
        if (asset.type == "ASA") {
          await this.redirectToASAPayment();
        }
        if (asset.type == "Native") {
          await this.redirectToNativePayment();
        }
        if (asset.type == "ARC200") {
          await this.redirectToARC200Payment();
        }
        //this.page = "review";
        this.error = "";
        this.confirmedRound = "";
        this.tx = null;

        this.processing = false;
        this.prolong();
        e.preventDefault();
      } catch (e) {
        console.error("previewPaymentClick.error", e);
        this.openError(e.message ?? e);
      }
    },
    async redirectToASAPayment() {
      try {
        const payTo = this.payTo;
        const payFrom = this.payFrom;
        const amount = this.amountLong;
        const note = this.paynote;
        let fee = this.feeLong;
        const asset = this.asset;

        const enc = new TextEncoder();
        let noteEnc = enc.encode(note);
        const tx = await this.preparePayment({
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
          reKeyTo: this.rekeyTo ? this.rekeyTo : undefined,
        });
        const encodedTx = algosdk.encodeUnsignedTransaction(tx);
        const b64 = Buffer.from(encodedTx).toString("base64");
        const b64Url = this.base642base64url(b64);
        this.$router.push(`/sign/${this.payFrom}/` + b64Url);
      } catch (e) {
        console.error("redirectToASAPayment.error", e);
        this.openError(e.message ?? e);
      }
    },
    async redirectToNativePayment() {
      try {
        const payTo = this.payTo;
        const payFrom = this.payFrom;
        const amount = this.amountLong;
        const note = this.paynote;
        let fee = this.feeLong;
        const asset = this.asset;

        const enc = new TextEncoder();
        let noteEnc = enc.encode(note);
        const tx = await this.preparePayment({
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
          reKeyTo: this.rekeyTo ? this.rekeyTo : undefined,
        });
        const encodedTx = algosdk.encodeUnsignedTransaction(tx);
        const b64 = Buffer.from(encodedTx).toString("base64");
        const b64Url = this.base642base64url(b64);
        this.$router.push(`/sign/${this.payFrom}/` + b64Url);
      } catch (e) {
        console.error("redirectToNativePayment.error", e);
        this.openError(e.message ?? e);
      }
    },

    async accountIsOptedInToArc200Asset(addr) {
      const indexerClient = await this.getIndexer();
      const fromDecoded = algosdk.decodeAddress(addr);
      const boxName = new Uint8Array(
        Buffer.concat([Buffer.from([0x00]), Buffer.from(fromDecoded.publicKey)])
      );
      try {
        const box = await indexerClient
          .lookupApplicationBoxByIDandName(state.arc200Info.arc200id, boxName)
          .do();
        return true;
      } catch (exc) {
        if (exc.message?.indexOf("no application boxes found")) {
          return false;
        } else {
          console.error(exc);
          throw exc;
        }
      }
    },
    async redirectToARC200Payment() {
      try {
        const algod = await this.getAlgod();
        const appId = Number(this.asset);
        const client = getArc200Client({
          algod,
          appId: appId,
          sender: { addr: this.payFrom },
        });
        const fromDecoded = algosdk.decodeAddress(this.payFrom);
        const toDecoded = algosdk.decodeAddress(this.payTo);
        var boxFrom = {
          // : algosdk.BoxReference
          appIndex: appId,
          name: new Uint8Array(
            Buffer.concat([
              Buffer.from([0x00]),
              Buffer.from(fromDecoded.publicKey),
            ])
          ), // data box
        };
        var boxTo = {
          // : algosdk.BoxReference
          appIndex: appId,
          name: new Uint8Array(
            Buffer.concat([
              Buffer.from([0x00]),
              Buffer.from(toDecoded.publicKey),
            ])
          ), // data box
        };
        const compose = client.compose().arc200Transfer(
          { to: this.payTo, value: BigInt(this.amountLong) },
          {
            boxes: [boxFrom, boxTo],
          }
        );

        const enc = new TextEncoder();
        let noteEnc = enc.encode("g");
        const atc = await compose.atc();
        const txsToSignArc200 = atc.buildGroup().map((tx) => tx.txn);
        const isOptedIn = await this.accountIsOptedInToArc200Asset(this.payTo);
        if (!isOptedIn) {
          // we have to opt in for payTo account (pay for the box)
          const payTx = await this.preparePayment({
            payTo: algosdk.getApplicationAddress(appId),
            payFrom: this.payFrom,
            amount: 28500,
            noteEnc: noteEnc,
            fee: undefined,
            asset: undefined,
            reKeyTo: undefined,
          });
          const txsToSign = [];
          txsToSign.push(payTx);
          txsToSignArc200.forEach((tx) => {
            txsToSign.push(tx);
          });
          algosdk.assignGroupID(txsToSign);
          await this.signerToSignArray({
            txs: txsToSign,
          });
          await this.$router.push("/signAll");
        } else {
          this.tx = txsToSignArc200[0];
          const encoded = this.base642base64url(
            Buffer.from(algosdk.encodeUnsignedTransaction(this.tx)).toString(
              "base64"
            )
          );
          this.$router.push(`/sign/${this.payFrom}/${encoded}`);
        }
      } catch (e) {
        console.error("redirectToARC200Payment.error", e);
        this.openError(e.message ?? e);
      }
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
      for (const acc of this.accountsFromMultisig) {
        try {
          if (!acc.addr) continue;
          if (!selected.includes(acc.addr)) {
            continue;
          }
          const newTx = await this.signerSignMultisig({
            msigTx: rawSignedTxn,
            signator: acc.addr,
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
      input = input.replaceAll(/-/g, "+").replaceAll(/_/g, "/");

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
      return input
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
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

      this.$router.push(
        `/sign/${this.payFrom}/` + this.base642base64url(this.rawSignedTxnInput)
      );

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

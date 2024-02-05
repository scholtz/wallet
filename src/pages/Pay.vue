<template>
  <main-layout>
    <div v-if="!$route.params.account">
      <h1>{{ $t("pay.select_account_for_payment") }}</h1>
      <SelectAccount v-model="payFromDirect" class="w-full"></SelectAccount>
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
            <p>{{ $t("pay.signature_from_friend") }}:</p>
            <Textarea
              v-model="rawSignedTxnInput"
              class="form-control my-2"
              rows="8"
            />
            <Button class="my-2" @click="loadMultisig">
              {{ $t("pay.load_multisig_data") }}
            </Button>
          </div>
        </div>
        <div v-if="showDesignScreen" class="grid">
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
            <div class="field grid" v-else>
              <div v-if="!isRekey" class="w-full">
                <TabView class="w-full">
                  <TabPanel :header="$t('pay.pay_to_wallet')" class="mr-2">
                    <SelectAccount
                      v-model="payTo"
                      class="w-full"
                    ></SelectAccount>
                  </TabPanel>
                  <TabPanel :header="$t('pay.pay_to_other')">
                    <InputText id="payTo" v-model="payTo" class="w-full" />
                    <div>
                      <Button size="small" class="m-2" @click="toggleCamera">
                        {{ $t("pay.toggle_camera") }}
                      </Button>
                      <p>
                        {{ $t("pay.store_other_help") }}
                      </p>
                    </div>
                  </TabPanel>
                </TabView>
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
                  <InputText id="rekeyTo" v-model="rekeyTo" class="w-full" />
                  <div>
                    <Button size="small" class="m-2" @click="toggleCamera">
                      {{ $t("pay.toggle_camera") }}
                    </Button>
                    <p>
                      {{ $t("pay.store_other_help") }}
                    </p>
                  </div>
                </TabPanel>
              </TabView>
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
                  <InputText v-model="assetObj.name" class="w-full" disabled />
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
                    optionLabel="asset-id"
                    optionValue="asset-id"
                    :placeholder="$t('pay.asset')"
                    class="w-full"
                    inputClass="w-full"
                  >
                    <template #value="slotProps">
                      <div
                        v-if="slotProps.value"
                        class="flex align-items-center"
                      >
                        <div>
                          {{
                            assets.find((a) => a["asset-id"] == slotProps.value)
                              ?.name
                          }}
                          (
                          {{ slotProps.value }}
                          )
                        </div>
                      </div>
                      <span v-else>
                        {{ slotProps.placeholder }}
                      </span>
                    </template>
                    <template #option="slotProps">
                      <div
                        v-if="slotProps.option"
                        class="flex align-items-center"
                      >
                        <div>
                          {{ slotProps.option.name }} : ({{
                            $filters.formatCurrency(
                              slotProps.option["amount"],
                              slotProps.option["name"],
                              slotProps.option["decimals"]
                            )
                          }})
                        </div>
                      </div>
                    </template>
                  </Dropdown>
                </div>
              </div>
            </div>
            <Message severity="error" v-if="payamountGtMaxAmount" class="my-2">
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
                    :step="0.001"
                    class="w-full"
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
                <Button :disabled="isNotValid" class="my-2">
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
      </form>
      <form v-if="page == 'review'" @submit="payPaymentClick">
        <h1>{{ $t("pay.review_payment") }}</h1>
        <p>{{ $t("pay.review_payment_help") }}</p>
        <div class="grid">
          <div class="col">
            <table v-if="!multisigDecoded.txn" class="w-100">
              <tr>
                <th>{{ $t("pay.from_account") }}:</th>
                <td>{{ payFrom }}</td>
              </tr>
              <tr v-if="malformedAddress">
                <td colspan="2">
                  <Message severity="error">
                    {{ $t("pay.pay_to_address_malformed") }}
                  </Message>
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
                <td>
                  <Message severity="error">
                    {{ rekeyTo }}
                  </Message>
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
                  <td>
                    <Message severity="error">
                      {{ encodeAddress(multisigDecoded.txn.reKeyTo.publicKey) }}
                    </Message>
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
                  <Badge
                    severity="success"
                    v-if="sig.s"
                    :value="encodeAddress(sig.pk)"
                  />
                  <Badge
                    severity="danger"
                    v-if="!sig.s"
                    :value="encodeAddress(sig.pk)"
                  />
                </th>
                <td>
                  <Badge
                    severity="success"
                    v-if="sig.s"
                    :value="$t('pay.signed')"
                  />
                  <Badge
                    severity="danger"
                    v-if="!sig.s"
                    :value="$t('pay.not_signed')"
                  />
                </td>
              </tr>
            </table>
          </div>
        </div>

        <Button v-if="!isMultisig" type="submit">
          {{ $t("pay.process_payment") }}
        </Button>
        <span v-if="!rawSignedTxn">
          <Button
            v-if="isMultisig && $route.name != 'PayFromWalletConnect'"
            type="submit"
          >
            {{ $t("pay.create_multisig_proposal") }}
          </Button>

          <Button
            v-if="$route.name != 'PayFromWalletConnect'"
            severity="secondary"
            class="mx-2"
            @click="page = 'design'"
          >
            {{ $t("global.go_back") }}
          </Button>
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
              <Button
                class="my-2"
                :disabled="!txtCode || txtCode.indexOf('_') >= 0"
                @click="sign2FAClick"
              >
                {{ $t("pay.sign") }}
              </Button>
            </div>
          </div>
          <div v-else>
            <Button class="my-2" @click="authorizePrimaryAccountClick">
              {{ $t("pay.sign_arc14_request") }}
            </Button>
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
            <Button
              class="my-2"
              :disabled="signMultisigWith.length == 0"
              @click="signMultisig"
            >
              {{ $t("pay.sign") }}
            </Button>
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
            <Button
              v-if="rawSignedTxnFriend"
              class="m-2"
              :disabled="!rawSignedTxn && !rawSignedTxnInput"
              @click="combineSignatures"
            >
              {{ $t("pay.combine_action") }}
            </Button>
          </div>

          <Button
            v-if="$route.name != 'PayFromWalletConnect'"
            class="m-2"
            :disabled="!thresholdMet"
            @click="sendMultisig"
          >
            {{ $t("pay.send_to_network") }}
          </Button>
          <Button
            v-if="$route.name == 'PayFromWalletConnect'"
            class="m-2"
            :disabled="!thresholdMet"
            @click="retToWalletConnect"
          >
            {{ $t("pay.return_to_wc") }}
          </Button>
          <Button
            v-if="isSignedByAny"
            severity="secondary"
            class="m-2"
            @click="toggleShowFormSend"
          >
            {{ $t("pay.toggle_send_to_others_form") }}
          </Button>
          <Button
            severity="secondary"
            class="m-2"
            @click="toggleShowFormCombine"
          >
            {{ $t("pay.toggle_combine_with_others_form") }}
          </Button>
        </div>

        <Message severity="info" v-if="!tx && processing" class="my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          />
          {{ $t("pay.state_sending") }}
        </Message>
        <Message severity="info" v-if="tx && !confirmedRound" class="my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          />
          {{ $t("pay.state_sent") }}: {{ tx }}.
          {{ $t("pay.state_waiting_confirm") }}
        </Message>
        <Message severity="success" v-if="confirmedRound" class="my-2">
          {{ $t("pay.state_confirmed") }} <b>{{ confirmedRound }}</b
          >. {{ $t("pay.transaction") }}: {{ tx }}.
        </Message>
        <Message severity="error" v-if="error" class="my-2">
          {{ $t("pay.error") }}: {{ error }}
        </Message>
        <Message
          severity="error"
          v-if="$store.state.toast.lastError"
          class="my-2"
        >
          {{ $t("global.last_error") }}: {{ $store.state.toast.lastError }}
        </Message>
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

export default {
  components: {
    QrcodeStream,
    MainLayout,
    InputMask,
    JsonViewer,
    SelectAccount,
    TabView,
    TabPanel,
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

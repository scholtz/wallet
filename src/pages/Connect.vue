<template>
  <MainLayout>
    <div v-if="$store.state.wc.web3wallet">
      <h1>{{ $t("connect.title") }}</h1>

      <Card>
        <template #content>
          <div>
            <div v-if="requests.length > 0">
              <h2 id="requests">
                {{ $t("connect.requests") }}
              </h2>
              <DataTable
                v-model:expandedRows="expandedRequests"
                v-model:selection="selectedRequest"
                :value="requests"
                responsive-layout="scroll"
                selection-mode="single"
                :paginator="true"
                :rows="20"
              >
                <Column expander style="width: 5rem" />
                <Column
                  field="id"
                  :header="$t('connect.request_id')"
                  :sortable="true"
                />
                <Column
                  field="method"
                  :header="$t('connect.method')"
                  :sortable="true"
                />
                <Column :header="$t('connect.total_fee')">
                  <template #body="slotProps">
                    {{ $filters.formatCurrency(slotProps.data.fee) }}
                  </template>
                </Column>
                <Column>
                  <template #body="slotProps">
                    <Button
                      class="m-1"
                      v-if="!atLeastOneSigned(slotProps.data)"
                      @click="clickSignAll(slotProps.data)"
                    >
                      {{ $t("connect.sign_all") }}
                    </Button>
                    <Button
                      class="m-1"
                      :disabled="
                        !$store.state.wallet.isOpen ||
                        !atLeastOneSigned(slotProps.data)
                      "
                      @click="clickAccept(slotProps.data)"
                    >
                      {{ $t("connect.sendBack") }}
                    </Button>
                    <span v-if="!atLeastOneSigned(slotProps.data)" class="m-2">
                      {{ $t("connect.sign_txs") }}
                    </span>
                    <Button
                      class="m-1"
                      :disabled="!$store.state.wallet.isOpen"
                      @click="clickReject(slotProps.data)"
                    >
                      {{ $t("connect.reject") }}
                    </Button>
                  </template>
                </Column>
                <template #expansion="slotProps">
                  <div class="p-3">
                    <DataTable
                      v-model:expandedRows="expandedTransactions"
                      v-model:selection="selectedTransaction"
                      :value="slotProps.data.transactions"
                      selection-mode="single"
                    >
                      <Column expander style="width: 5rem" />
                      <Column>
                        <template #body="slotProps">
                          <Button
                            v-if="toBeSigned(slotProps.data)"
                            class="m-1"
                            :disabled="!$store.state.wallet.isOpen"
                            @click="clickSign(slotProps.data)"
                          >
                            {{ $t("connect.sign") }}
                          </Button>
                          <Badge
                            severity="success"
                            v-else
                            class="badge bg-success"
                            :value="$t('connect.signed')"
                          />
                        </template>
                      </Column>
                      <Column
                        field="index"
                        :header="$t('connect.index')"
                        :sortable="true"
                      />
                      <Column
                        field="type"
                        :header="$t('connect.type')"
                        :sortable="true"
                      />
                      <Column
                        field="from"
                        :header="$t('connect.from')"
                        :sortable="true"
                      />
                      <Column
                        field="asset"
                        :header="$t('connect.asset')"
                        :sortable="true"
                      />
                      <Column
                        field="amount"
                        :header="$t('connect.amount')"
                        :sortable="true"
                      >
                        <template #body="slotProps">
                          <div v-if="slotProps.data.txn">
                            <div
                              v-if="slotProps.data.txn['type'] == 'pay'"
                              class="text-end"
                            >
                              {{
                                $filters.formatCurrency(
                                  slotProps.data.txn["amount"]
                                )
                              }}
                            </div>
                            <div
                              v-else-if="slotProps.data.txn['type'] == 'axfer'"
                              class="text-end"
                            >
                              {{
                                $filters.formatCurrency(
                                  slotProps.data.txn["amount"],
                                  getAssetName(
                                    slotProps.data.txn["assetIndex"]
                                  ),
                                  getAssetDecimals(
                                    slotProps.data.txn["assetIndex"]
                                  )
                                )
                              }}
                            </div>
                          </div>
                        </template>
                      </Column>
                      <Column
                        field="fee"
                        :header="$t('connect.fee')"
                        :sortable="true"
                      >
                        <template #body="slotProps">
                          {{ $filters.formatCurrency(slotProps.data["fee"]) }}
                        </template>
                      </Column>
                      <Column
                        field="rekeyTo"
                        :header="$t('connect.rekeyto')"
                        :sortable="true"
                      />
                      <template #expansion="txProps">
                        <div class="p-3">
                          <table>
                            <tr v-if="txProps.data.txn.from">
                              <td>{{ $t("connect.from") }}:</td>
                              <td>
                                {{ encodeAddress(txProps.data.txn.from) }}
                              </td>
                            </tr>
                            <tr v-if="txProps.data.txn.to">
                              <td>{{ $t("connect.to") }}:</td>
                              <td>
                                {{ encodeAddress(txProps.data.txn.to) }}
                              </td>
                            </tr>
                            <tr>
                              <td>{{ $t("connect.validity") }}:</td>
                              <td>
                                {{ txProps.data.txn.firstRound }} -
                                {{ txProps.data.txn.lastRound }} ({{
                                  txProps.data.txn.lastRound -
                                  txProps.data.txn.firstRound +
                                  1
                                }}
                                {{ $t("connect.rounds") }})
                              </td>
                            </tr>
                            <tr>
                              <td>{{ $t("connect.type") }}:</td>
                              <td>{{ txProps.data.type }}</td>
                            </tr>
                            <tr>
                              <td>{{ $t("connect.note") }}:</td>
                              <td>
                                <table>
                                  <tr>
                                    <td>
                                      {{
                                        formatData(
                                          txProps.data.txn.note,
                                          "Text"
                                        )
                                      }}
                                    </td>
                                    <td>
                                      {{
                                        formatData(
                                          txProps.data.txn.note,
                                          "UInt"
                                        )
                                      }}
                                    </td>
                                    <td>
                                      {{
                                        formatData(txProps.data.txn.note, "Hex")
                                      }}
                                    </td>
                                    <td>
                                      {{
                                        formatData(txProps.data.txn.note, "B64")
                                      }}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr v-if="txProps.data.txn.group">
                              <td>{{ $t("connect.group") }}:</td>
                              <td>{{ formatGroup(txProps.data.txn.group) }}</td>
                            </tr>

                            <tr v-if="txProps.data.type == 'appl'">
                              <td>{{ $t("connect.app") }}:</td>
                              <td>{{ txProps.data.txn.appIndex }}</td>
                            </tr>

                            <tr
                              v-if="
                                txProps.data.type == 'appl' &&
                                txProps.data.txn.appArgs
                              "
                            >
                              <td>{{ $t("connect.app_args") }}:</td>
                              <td>
                                <table>
                                  <tr
                                    v-for="(arg, index) in txProps.data.txn
                                      .appArgs"
                                    :key="arg"
                                  >
                                    <td>{{ index + 1 }}.</td>
                                    <td>{{ formatData(arg, "Text") }}</td>
                                    <td>{{ formatData(arg, "UInt") }}</td>
                                    <td>{{ formatData(arg, "Hex") }}</td>
                                    <td>{{ formatData(arg, "B64") }}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr
                              v-if="
                                txProps.data.type == 'appl' &&
                                txProps.data.txn.appAccounts
                              "
                            >
                              <td>{{ $t("connect.app_accounts") }}:</td>
                              <td>
                                <ol>
                                  <li
                                    v-for="acc in txProps.data.txn.appAccounts"
                                    :key="acc"
                                  >
                                    {{ formatAppAccount(acc) }}
                                  </li>
                                </ol>
                              </td>
                            </tr>

                            <tr
                              v-if="
                                txProps.data.type == 'appl' &&
                                txProps.data.txn.appForeignAssets
                              "
                            >
                              <td>{{ $t("connect.app_assets") }}:</td>
                              <td>
                                <ol>
                                  <li
                                    v-for="asset in txProps.data.txn
                                      .appForeignAssets"
                                    :key="asset"
                                  >
                                    {{ asset }}
                                  </li>
                                </ol>
                              </td>
                            </tr>
                            <tr
                              v-if="
                                txProps.data.type == 'appl' &&
                                txProps.data.txn.boxes
                              "
                            >
                              <td>{{ $t("connect.boxes") }}:</td>
                              <td>
                                <ol>
                                  <li
                                    v-for="box in txProps.data.txn.boxes"
                                    :key="box.name"
                                  >
                                    {{ $t("connect.app") }}: {{ box.appIndex }},
                                    {{ $t("connect.name") }}:
                                    {{ box.name }}
                                  </li>
                                </ol>
                              </td>
                            </tr>
                            <tr>
                              <td>{{ $t("connect.genesis") }}:</td>
                              <td>{{ txProps.data.txn.genesisID }}</td>
                            </tr>
                            <tr>
                              <td>{{ $t("connect.genesis_hash") }}:</td>
                              <td>
                                {{
                                  formatGenesisHash(
                                    txProps.data.txn.genesisHash
                                  )
                                }}
                              </td>
                            </tr>
                          </table>
                        </div>
                      </template>
                    </DataTable>
                  </div>
                </template>
              </DataTable>
            </div>
            <div v-else-if="sessionProposals && sessionProposals.length > 0">
              <h2 id="session_proposals">
                {{ $t("connect.session_proposals") }}
              </h2>
              <DataTable :value="sessionProposals" :paginator="true" :rows="20">
                <Column
                  field="id"
                  :header="$t('connect.request_id')"
                  :sortable="true"
                />
                <Column :header="$t('connect.proposer')">
                  <template #body="slotProps">
                    <div
                      v-if="
                        slotProps.data.params.proposer &&
                        slotProps.data.params.proposer.metadata
                      "
                    >
                      <img
                        v-if="
                          slotProps.data.params.proposer.metadata &&
                          slotProps.data.params.proposer.metadata.icons &&
                          slotProps.data.params.proposer.metadata.icons.length
                        "
                        :src="slotProps.data.params.proposer.metadata.icons[0]"
                        width="24"
                        height="24"
                      />

                      <a
                        target="_blank"
                        class="m-1"
                        :href="
                          normalizeUrl(
                            slotProps.data.params.proposer.metadata.url
                          )
                        "
                        :title="
                          slotProps.data.params.proposer.metadata.description
                        "
                        v-if="
                          slotProps.data.params.proposer &&
                          slotProps.data.params.proposer.metadata &&
                          slotProps.data.params.proposer.metadata.url
                        "
                      >
                        {{ slotProps.data.params.proposer.metadata.name }}
                      </a>
                      <div v-else>
                        {{ slotProps.data.params.proposer.metadata.name }}
                      </div>
                    </div>
                  </template>
                </Column>
                <Column :header="$t('connect.all_accounts')">
                  <template #body="slotProps">
                    <Checkbox v-model="allAccounts" :binary="true"></Checkbox>
                  </template>
                </Column>
                <Column :header="$t('connect.connected')" :sortable="true">
                  <template #body="slotProps">
                    <Button
                      variant="seondary"
                      class="m-1"
                      @click="clickApproveSession(slotProps.data.id)"
                    >
                      {{ $t("connect.connect") }}
                    </Button>
                    <Button
                      variant="secondary"
                      class="m-1"
                      @click="clickRejectSession(slotProps.data.id)"
                    >
                      {{ $t("connect.reject") }}
                    </Button>
                  </template>
                </Column>
              </DataTable>
            </div>
            <div v-else>
              <h2>{{ $t("connect.uri") }}</h2>
              <InputText
                id="uri"
                v-model="uri"
                class="w-full"
                autocomplete="off"
              />
              <div v-if="scan" class="col-12 m-2">
                <QrcodeStream @decode="onDecodeQR" />
              </div>
              <div>
                <Button
                  class="m-1"
                  :disabled="uri && !connectable"
                  @click="clickConnect(uri)"
                >
                  {{ $t("connect.connect") }}
                </Button>
                {{ $t("connect.or") }}
                <Button class="m-1" @click="clickPaste">
                  {{ $t("connect.clipboard") }}
                </Button>
                {{ $t("connect.or") }}
                <Button class="m-1" @click="scan = !scan">
                  {{ $t("connect.toggle_camera") }}
                </Button>
              </div>
            </div>

            <div v-if="connectors && connectors.length > 0">
              <h2>{{ $t("connect.sessions") }}</h2>
              <DataTable
                :value="connectors"
                responsive-layout="scroll"
                selection-mode="single"
                :paginator="true"
                :rows="20"
              >
                <Column
                  field="id"
                  :header="$t('connect.client_id')"
                  :sortable="true"
                />
                <Column
                  field="address"
                  :header="$t('connect.address')"
                  :sortable="true"
                >
                  <template #body="slotProps">
                    {{ slotProps.data.address }}
                  </template>
                </Column>
                <Column :header="$t('connect.peer')">
                  <template #body="slotProps">
                    <div v-if="slotProps.data.peer">
                      <img
                        v-if="
                          slotProps.data.peer.icons &&
                          slotProps.data.peer.icons.length
                        "
                        :src="slotProps.data.peer.icons[0]"
                        width="24"
                        height="24"
                      />
                      <a
                        target="_blank"
                        class="m-1"
                        :href="slotProps.data.peer.url"
                        :title="slotProps.data.peer.description"
                      >
                        {{ slotProps.data.peer.name }}
                      </a>
                    </div>
                  </template>
                </Column>
                <Column :header="$t('connect.connected')" :sortable="true">
                  <template #body="slotProps">
                    <input
                      class="form-check-input me-1"
                      type="checkbox"
                      :checked="slotProps.data.connected"
                      disabled
                    />
                    <Button
                      variant="secondary"
                      class="m-1"
                      @click="clickDisconnect(slotProps.data.id)"
                    >
                      {{ $t("connect.disconnect") }}
                    </Button>
                  </template>
                </Column>
              </DataTable>
            </div>
            <Message severity="error" v-if="error" class="my-2">
              {{ error }}
            </Message>
          </div>
        </template>
      </Card>
    </div>
    <div class="container-fluid" v-else>
      <h1>{{ $t("connect.title") }}</h1>

      <Card>
        <template #content>
          <Button @click="initConnection">{{ $t("connect.init_wc") }}</Button>
        </template>
      </Card>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
import wc from "../shared/wc";
import { QrcodeStream } from "qrcode-reader-vue3";

export default {
  components: {
    MainLayout,
    QrcodeStream,
  },
  data() {
    return {
      uri: "",
      addr: "",
      note: "",
      error: "",
      selectedRequest: null,
      selectedTransaction: null,
      expandedRequests: [],
      expandedTransactions: [],
      scan: false,
      allAccounts: true,
    };
  },
  computed: {
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
    requests() {
      return this.$store.state.wc.requests;
    },
    connectable() {
      return this.uri;
    },
    sessionProposals() {
      return this.$store.state.wc.sessionProposals;
    },
    connectors() {
      return this.$store.state.wc.connectors;
    },
    theme() {
      return this.$store.state.config.theme;
    },
  },
  async mounted() {
    this.addr = this.$route.params.account;
    await this.reloadAccount();
    this.prolong();
  },
  methods: {
    ...mapActions({
      accountInformation: "indexer/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
      deleteAccount: "wallet/deleteAccount",
      setTransaction: "wallet/setTransaction",
      getAsset: "indexer/getAsset",
      prolong: "wallet/prolong",
      setAccountOnline: "kmd/setAccountOnline",
      openSuccess: "toast/openSuccess",
      openError: "toast/openError",
      axiosGet: "axios/get",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      waitForConfirmation: "algod/waitForConfirmation",
      getSignerType: "signer/getSignerType",
      signerSignTransaction: "signer/signTransaction",
      signerToSign: "signer/toSign",
      wcInit: "wc/init",
      connectUri: "wc/connectUri",
      approveSession: "wc/approveSession",
      rejectSession: "wc/rejectSession",
      sendResult: "wc/sendResult",
      cancelRequest: "wc/cancelRequest",
    }),
    normalizeUrl(url) {
      if (url.indexOf("http") === 0) return url;
      if (url.indexOf("//") == 0) return url;
      return "https://" + url;
    },
    initConnection() {
      this.wcInit();
    },
    formatNote(note) {
      try {
        return Buffer.from(note).toString();
      } catch {
        return note;
      }
    },
    isASCIIText(str) {
      return /^[\x20-\x7E]*$/.test(str);
    },

    formatData(arg, type) {
      try {
        if (Buffer.from(arg).length == 0) return "";
        if (type == "Text") {
          if (!this.isASCIIText(Buffer.from(arg).toString("utf-8")))
            return "-- Non ASCII --";
          return `${Buffer.from(arg).toString("utf-8")}`;
        }
        if (type == "UInt") {
          if (Buffer.from(arg).length != 8) return "";
          return `Num: ${algosdk.decodeUint64(
            new Uint8Array(Buffer.from(arg))
          )}`;
        }
        if (type == "Hex") return `Hex: 0x${Buffer.from(arg).toString("hex")}`;
        if (type == "B64") return `B64: ${Buffer.from(arg).toString("base64")}`;
        return arg;
      } catch {
        return arg;
      }
    },
    formatAppAccount(acc) {
      try {
        return algosdk.encodeAddress(acc.publicKey);
      } catch {
        return acc;
      }
    },
    formatGroup(group) {
      try {
        return group.toString("base64");
      } catch {
        return group;
      }
    },
    formatGenesisHash(genesisHash) {
      return Buffer.from(genesisHash).toString("base64");
    },
    async reloadAccount() {
      if (this.$route.params.account) {
        await this.accountInformation({
          addr: this.$route.params.account,
        }).then(async (info) => {
          if (info) {
            await this.updateAccount({ info });
          }
        });
      }
    },
    async clickSignAll(data) {
      if (!data.transactions) {
        console.error("No transactions to sign");
        return;
      }
      for (const tx of data.transactions) {
        await this.clickSign(tx);
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
    base642base64url(input) {
      return input
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
    },
    async clickSign(data) {
      const txId = data.txn.txID();
      const isSigned = txId in this.$store.state.signer.signed;
      if (isSigned) {
        return;
      }
      const type = await this.getSignerType({
        from: data.from,
      });
      console.log("signerType", type);
      if (type == "msig") {
        this.signerToSign({ tx: data.txn });
        const encodedtxn = algosdk.encodeUnsignedTransaction(data.txn);
        const urldataB64 = this._arrayBufferToBase64(encodedtxn);
        const urldataB64url = this.base642base64url(urldataB64);
        this.$router.push(
          `/payWC/${this.$route.params.account}/${urldataB64url}`
        );
      } else {
        const signed = await this.signerSignTransaction({
          from: data.from,
          signator: data.from,
          tx: data.txn,
        });
      }
    },
    async clickAccept(data) {
      this.prolong();
      console.log("sendResult", data);
      try {
        await this.sendResult({ data });
        // if (data.ver == 2) {
        // } else {

        //   await wc.acceptRequest(id);
        // }
        this.openSuccess({
          severity: "info",
          summary: "Request accepted",
          life: 3000,
        });
      } catch (ex) {
        this.openError({
          severity: "error",
          summary: "Accept request failed",
          detail: ex,
          life: 5000,
        });
      }
    },
    async clickReject(data) {
      this.prolong();

      this.cancelRequest({ data });
      //wc.rejectRequest(data.id);

      this.openSuccess({
        severity: "info",
        summary: "Request rejected",
        life: 3000,
      });
    },
    async clickDisconnect(id) {
      this.prolong();
      await wc.removeConnector(id);
      this.openSuccess({
        severity: "info",
        summary: "Session removed",
        life: 3000,
      });
    },
    async clickPaste() {
      this.prolong();
      const uri = await navigator.clipboard.readText();
      try {
        await this.clickConnect(uri);
      } catch (ex) {
        this.openError({
          severity: "error",
          summary: "Connect from Clipboard",
          life: 5000,
          detail: ex,
        });
        throw ex;
      }
    },
    async clickConnect(uri) {
      this.prolong();
      this.connectUri({ uri });

      this.openSuccess({
        severity: "info",
        summary: "Session added",
        life: 3000,
      });
    },
    async clickApproveSession(id) {
      try {
        await this.approveSession({ id, allAccounts: this.allAccounts });
      } catch (err) {
        const error = err.message ?? err;
        this.openError(error);
      }
    },
    async clickRejectSession(id) {
      try {
        await this.rejectSession({ id });
      } catch (err) {
        const error = err.message ?? err;
        this.openError(error);
      }
    },
    toBeSigned(data) {
      const txId = data.txn.txID();
      const signed = txId in this.$store.state.signer.signed;
      if (!signed) return true; // if not signed return true to show sign button
      const from = this.encodeAddress(data.txn.from);
      const type = this.getSignerType({
        from: from,
      });
      if (type == "msig") {
        // check sign threshold
        const signedTx = algosdk.decodeSignedTransaction(
          this.$store.state.signer.signed[txId]
        );

        const ret =
          signedTx.msig.subsig.filter((s) => !!s.s).length < signedTx.msig.thr;
        return ret;
      } else {
        return !signed;
      }
    },
    atLeastOneSigned(data) {
      for (let tx of data.transactions) {
        if (tx.txn.txID() in this.$store.state.signer.signed) return true;
      }
      return false;
    },
    encodeAddress(addr) {
      if (!addr || !addr.publicKey) return "-";
      return algosdk.encodeAddress(addr.publicKey);
    },
    getAssetSync(id) {
      const ret = this.$store.state.indexer.assets.find(
        (a) => a["asset-id"] == id
      );
      return ret;
    },
    getAssetName(id) {
      const asset = this.getAssetSync(id);
      if (asset) return asset["name"];
    },
    getAssetDecimals(id) {
      const asset = this.getAssetSync(id);
      if (asset) return asset["decimals"];
    },
    onDecodeQR(result) {
      if (result) {
        this.uri = result;
        this.scan = false;
      }
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
  },
};
</script>

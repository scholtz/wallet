<template>
  <PublicLayout>
    <div class="container-fluid">
      <h1>{{ $t("connect.title") }}</h1>

      <div v-if="checkNetwork()">
        {{ $t("swap.network") }}: {{ checkNetwork() }}
      </div>
      <div v-else class="alert alert-danger">
        {{ $t("connect.network_not_supported") }}
      </div>
      <div>
        <h2>{{ $t("connect.address") }}</h2>
        <select v-model="addr" class="form-control">
          <option
            v-for="option in $store.state.wallet.privateAccounts"
            :key="option.addr"
            :value="option.addr"
          >
            {{ option.name + " - " + option.addr }}
          </option>
        </select>
      </div>
      <div>
        <h2>{{ $t("connect.uri") }}</h2>
        <input
          id="uri"
          v-model="uri"
          type="text"
          class="form-control"
          autocomplete="off"
        />
        <div>
          <button
            class="btn btn-primary m-1"
            :disabled="uri && !connectable"
            @click="clickConnect(uri)"
          >
            {{ $t("connect.connect") }}
          </button>
          {{ $t("connect.or") }}
          <button
            class="btn btn-primary m-1"
            :disabled="!connectable"
            @click="clickPaste"
          >
            {{ $t("connect.clipboard") }}
          </button>
        </div>
        <div>
          <h2>{{ $t("connect.sessions") }}</h2>
          <DataTable
            :value="$store.state.wc.connectors"
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
                <button
                  class="btn btn-light m-1"
                  @click="clickDisconnect(slotProps.data.id)"
                >
                  {{ $t("connect.disconnect") }}
                </button>
              </template>
            </Column>
          </DataTable>
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
                {{ slotProps.data.fee }}
              </template>
            </Column>
            <Column>
              <template #body="slotProps">
                <button
                  class="btn btn-primary m-1"
                  :disabled="
                    !$store.state.wallet.isOpen ||
                    !atLeastOneSigned(slotProps.data)
                  "
                  @click="clickAccept(slotProps.data.id)"
                >
                  {{ $t("connect.sendBack") }}
                </button>
                <span v-if="!atLeastOneSigned(slotProps.data)" class="m-2">
                  {{ $t("connect.sign_txs") }}
                </span>
                <button
                  class="btn btn-light m-1"
                  :disabled="!$store.state.wallet.isOpen"
                  @click="clickReject(slotProps.data.id)"
                >
                  {{ $t("connect.reject") }}
                </button>
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
                      <button
                        v-if="toBeSigned(slotProps.data)"
                        class="btn btn-primary m-1"
                        :disabled="!$store.state.wallet.isOpen"
                        @click="clickSign(slotProps.data)"
                      >
                        {{ $t("connect.sign") }}
                      </button>
                      <span v-else class="badge bg-success">{{
                        $t("connect.signed")
                      }}</span>
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
                  />
                  <Column
                    field="fee"
                    :header="$t('connect.fee')"
                    :sortable="true"
                  />
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
                                    formatData(txProps.data.txn.note, "Text")
                                  }}
                                </td>
                                <td>
                                  {{
                                    formatData(txProps.data.txn.note, "UInt")
                                  }}
                                </td>
                                <td>
                                  {{ formatData(txProps.data.txn.note, "Hex") }}
                                </td>
                                <td>
                                  {{ formatData(txProps.data.txn.note, "B64") }}
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
                                v-for="(arg, index) in txProps.data.txn.appArgs"
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
                              formatGenesisHash(txProps.data.txn.genesisHash)
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
          <Toast />
        </div>
        <div v-if="error" class="alert alert-danger my-2">
          {{ error }}
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
import wc from "../shared/wc";

export default {
  components: {
    PublicLayout,
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
      return this.addr;
    },
  },
  watch: {
    account() {},
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
      axiosGet: "axios/get",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      waitForConfirmation: "algod/waitForConfirmation",
      getSignerType: "signer/getSignerType",
      signerSignTransaction: "signer/signTransaction",
      signerToSign: "signer/toSign",
    }),
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
    async clickSign(data) {
      console.log("data", data);

      const type = await this.getSignerType({
        from: data.from,
      });
      if (type == "msig") {
        this.signerToSign({ tx: data.txn });
        this.$router.push("/payWC/");
      } else {
        const signed = await this.signerSignTransaction({
          from: data.from,
          signator: data.from,
          tx: data.txn,
        });
        console.log("signed", signed);
      }
      console.log("data", type, data);
    },
    async clickAccept(id) {
      this.prolong();

      try {
        await wc.acceptRequest(id);

        this.$toast.add({
          severity: "info",
          summary: "Request accepted",
          life: 3000,
        });
      } catch (ex) {
        this.$toast.add({
          severity: "error",
          summary: "Accept request failed",
          detail: ex,
          life: 5000,
        });
      }
    },
    async clickReject(id) {
      this.prolong();

      wc.rejectRequest(id);

      this.$toast.add({
        severity: "info",
        summary: "Request rejected",
        life: 3000,
      });
    },
    async clickDisconnect(id) {
      this.prolong();
      await wc.removeConnector(id);
      this.$toast.add({
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
        this.$toast.add({
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
      wc.createConnector(uri, this.addr);

      this.$toast.add({
        severity: "info",
        summary: "Session added",
        life: 3000,
      });
    },
    checkNetwork() {
      if (this.$store.state.config.env == "mainnet-v1.0") {
        return "mainnet-v1.0";
      }
      if (this.$store.state.config.env == "mainnet") {
        return "mainnet-v1.0";
      }
      if (this.$store.state.config.env == "testnet-v1.0") {
        return "testnet-v1.0";
      }
      if (this.$store.state.config.env == "testnet") {
        return "testnet-v1.0";
      }
      return this.$store.state.config.env;
    },
    toBeSigned(data) {
      console.log("isSigned.data", data);
      const txId = data.txn.txID();
      console.log("isSigned.txId", txId);
      const signed = txId in this.$store.state.signer.signed;
      console.log("isSigned.signed", signed);
      if (!signed) return true; // if not signed return true to show sign button
      console.log("data.txn", data.txn);
      const from = this.encodeAddress(data.txn.from);
      console.log("from", from);
      const type = this.getSignerType({
        from: from,
      });
      console.log("type", type);
      if (type == "msig") {
        // check sign threshold
        const signedTx = algosdk.decodeSignedTransaction(
          this.$store.state.signer.signed[txId]
        );
        console.log("signedTx.msig", signedTx.msig);
        console.log(
          "signedTx.msig.subsig.filter((s) => !!s.s).length",
          signedTx.msig.subsig.filter((s) => !!s.s).length,
          signedTx.msig.thr
        );
        const ret =
          signedTx.msig.subsig.filter((s) => !!s.s).length < signedTx.msig.thr;
        console.log("ret", ret);
        return ret;
      } else {
        return !signed;
      }
    },
    atLeastOneSigned(data) {
      console.log("data", data);
      for (let tx of data.transactions) {
        if (tx.txn.txID() in this.$store.state.signer.signed) return true;
      }
      return false;
    },
    encodeAddress(addr) {
      if (!addr || !addr.publicKey) return "-";
      return algosdk.encodeAddress(addr.publicKey);
    },
  },
};
</script>
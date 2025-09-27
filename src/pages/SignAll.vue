<script setup lang="ts">
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { onMounted, reactive } from "vue";
import MainLayout from "../layouts/Main.vue";
import algosdk from "algosdk";
import formatCurrency from "../scripts/numbers/formatCurrency";

const store = useStore();
const router = useRouter();

const state = reactive({
  expandedTransactions: [],
  selectedTransaction: {},
  transactions: [],
  atLeastOneSigned: false,
  allTxsAreSigned: false,
  processing: false,
  error: "",
  confirmedRound: 0,
});

onMounted(async () => {
  await store.dispatch("wallet/prolong");

  const data = [];
  let index = 0;
  for (const txn of store.state.signer.toSignArray) {
    data.push({
      txn,
      index,
      type: txn.type,
      from: algosdk.encodeAddress(txn.from.publicKey),
      toBeSigned: await toBeSigned({ txn }),
    });
    index++;
  }
  state.transactions = data;
  await checkAtLeastOneSigned();
  await checkAllTxsAreSigned();
});

const formatGenesisHash = (genesisHash) => {
  return Buffer.from(genesisHash).toString("base64");
};

const encodeAddress = (addr) => {
  if (!addr || !addr.publicKey) return "-";
  return algosdk.encodeAddress(addr.publicKey);
};
const toBeSigned = async (data) => {
  const txId = data.txn.txID();
  const signed = txId in store.state.signer.signed;
  if (!signed) return true; // if not signed return true to show sign button
  const from = encodeAddress(data.txn.from);
  const type = await store.dispatch("signer/getSignerType", {
    from: from,
  });
  if (type == "msig") {
    // check sign threshold
    const signedTx = algosdk.decodeSignedTransaction(
      store.state.signer.signed[txId]
    );

    const ret =
      signedTx.msig.subsig.filter((s) => !!s.s).length < signedTx.msig.thr;
    return ret;
  } else {
    return !signed;
  }
};
const formatAppAccount = (acc) => {
  try {
    return algosdk.encodeAddress(acc.publicKey);
  } catch {
    return acc;
  }
};

const clickSign = async (data) => {
  const txId = data.txn.txID();
  const isSigned = txId in store.state.signer.signed;
  if (isSigned) {
    for (const index in state.transactions) {
      if (state.transactions[item].txn.txID() == txId) {
        state.transactions[item].toBeSigned = await toBeSigned({ txn });
      }
    }
    await checkAtLeastOneSigned();
    await checkAllTxsAreSigned();
    return;
  }
  const type = await store.dispatch("signer/getSignerType", {
    from: data.from,
  });
  if (type == "msig") {
    await store.dispatch("signer/returnTo", "SignAll");
    await store.dispatch("signer/toSign", { tx: data.txn });
    const encoded = base642base64url(
      Buffer.from(algosdk.encodeUnsignedTransaction(data.txn)).toString(
        "base64"
      )
    );
    router.push(`/sign/${data.from}/${encoded}`);
  } else {
    const signed = await store.dispatch("signer/signTransaction", {
      from: data.from,
      signator: data.from,
      tx: data.txn,
    });
    for (const index in state.transactions) {
      if (state.transactions[index].txn.txID() == txId) {
        state.transactions[index].toBeSigned = await toBeSigned({
          txn: data.txn,
        });
      }
    }
  }
  await checkAtLeastOneSigned();
  await checkAllTxsAreSigned();
};
const base642base64url = (input) => {
  return input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const isASCIIText = (str) => {
  return /^[\x20-\x7E]*$/.test(str);
};
const formatData = (arg, type) => {
  try {
    if (Buffer.from(arg).length == 0) return "";
    if (type == "Text") {
      if (!isASCIIText(Buffer.from(arg).toString("utf-8")))
        return "-- Non ASCII --";
      return `${Buffer.from(arg).toString("utf-8")}`;
    }
    if (type == "UInt") {
      if (Buffer.from(arg).length != 8) return "";
      return `Num: ${algosdk.decodeUint64(new Uint8Array(Buffer.from(arg)))}`;
    }
    if (type == "Hex") return `Hex: 0x${Buffer.from(arg).toString("hex")}`;
    if (type == "B64") return `B64: ${Buffer.from(arg).toString("base64")}`;
    return arg;
  } catch {
    return arg;
  }
};

const formatGroup = (group) => {
  try {
    return group.toString("base64");
  } catch {
    return group;
  }
};
const clickSignAll = async () => {
  for (const tx of state.transactions) {
    await clickSign(tx);
  }
};
const checkAtLeastOneSigned = () => {
  for (let tx of state.transactions) {
    if (tx.txn.txID() in store.state.signer.signed) {
      state.atLeastOneSigned = true;
      return true;
    }
  }
  state.atLeastOneSigned = false;
  return false;
};
const checkAllTxsAreSigned = () => {
  let result = true;
  for (let tx of state.transactions) {
    const id = tx.txn.txID();
    if (!(id in store.state.signer.signed)) {
      result = false;
    }
  }
  state.allTxsAreSigned = result;
  return result;
};

const submitSignedClick = async () => {
  try {
    state.processing = true;
    await store.dispatch("wallet/prolong");
    const signed = [];
    for (const txTableObject of state.transactions) {
      const id = txTableObject.txn.txID();
      if (!(id in store.state.signer.signed)) {
        throw Error(`Transaction ${id} not signed`);
      }
      signed.push(store.state.signer.signed[id]);
    }
    const tx = (
      await store.dispatch("algod/sendRawTransaction", {
        signedTxn: signed,
      })
    )?.txId;

    if (!tx) {
      console.error("submitSignedClick has failed");
      state.error = $t("pay.state_error_not_sent");
      store.dispatch("toast/openError", state.error);
      state.processing = false;
    }

    const confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId: tx,
      timeout: 4,
    });
    if (!confirmation) {
      console.error(`confirmation not received for tx`);
      state.processing = false;
      state.error = $t("pay.state_error_not_sent");
      store.dispatch("toast/openError", state.error);
      //            "Payment has probably not reached the network. Are you offline? Please check you account";
      return;
    }
    if (confirmation["confirmed-round"]) {
      state.processing = false;
      state.confirmedRound = confirmation["confirmed-round"];
      store.dispatch(
        "toast/openSuccess",
        `${t("sign_all.transaction_confirmed")} ${state.confirmedRound}`
      );
    }
    if (confirmation["pool-error"]) {
      state.processing = false;
      state.error = confirmation["pool-error"];
    }
    state.processing = false;
  } catch (exc) {
    console.error("submitSignedClick.error", exc);
    state.error = exc.message ?? exc;
    store.dispatch("toast/openError", state.error);
  }
};
const retToScheduledPayments = () => {
  router.push({
    name: "scheduled-payment",
    params: { account: store.state.wallet.lastActiveAccount },
  });
};

const getAssetSync = (id) => {
  const ret = store.state.indexer.assets.find((a) => a["asset-id"] == id);
  return ret;
};
const getAssetName = (id) => {
  const asset = getAssetSync(id);
  return asset.name;
};
const getAssetDecimals = (id) => {
  const asset = getAssetSync(id);
  return asset["decimals"];
};
</script>
<template>
  <MainLayout>
    <h1>{{ $t("sign_all.title") }}</h1>
    <Card>
      <template #content>
        <Message severity="error" v-if="state.error">{{ state.error }}</Message>
        <Message severity="success" v-if="state.confirmedRound">
          {{ `${$t("sign_all.transaction_confirmed")} ${state.confirmedRound}` }}
        </Message>

        <div>
          <Button
            class="mr-1"
            :disabled="state.allTxsAreSigned || state.confirmedRound"
            :severity="
              state.allTxsAreSigned || state.confirmedRound
                ? 'secondary'
                : 'primary'
            "
            @click="clickSignAll()"
          >
            {{ $t("connect.sign_all") }}
          </Button>
          <Button
            :disabled="
              !state.allTxsAreSigned || state.processing || state.confirmedRound
            "
            :severity="
              !state.allTxsAreSigned || state.processing || state.confirmedRound
                ? 'secondary'
                : 'primary'
            "
            @click="submitSignedClick"
          >
            Send tx to the network
            <ProgressSpinner
              v-if="state.processing"
              style="width: 1em; height: 1em"
              strokeWidth="10"
              class="ml-2"
            />
          </Button>
          <Button
            v-if="$store.state.signer.returnToSignAll == 'ScheduledPayments'"
            class="ml-2"
            :severity="state.confirmedRound ? 'primary' : 'secondary'"
            :disabled="!state.atLeastOneSigned"
            @click="retToScheduledPayments"
          >
            Return to scheduled payment management
          </Button>
        </div>
        <DataTable
          v-model:expandedRows="state.expandedTransactions"
          v-model:selection="state.selectedTransaction"
          :value="state.transactions"
          selection-mode="single"
        >
          <Column expander style="width: 5rem" />
          <Column>
            <template #body="slotProps">
              <Button
                v-if="slotProps.data.toBeSigned"
                class="m-1"
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
          <Column field="type" :header="$t('connect.type')" :sortable="true" />
          <Column field="from" :header="$t('connect.from')" :sortable="true" />
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
                  {{ formatCurrency(slotProps.data.txn["amount"]) }}
                </div>
                <div
                  v-else-if="slotProps.data.txn['type'] == 'axfer'"
                  class="text-end"
                >
                  {{
                    formatCurrency(
                      slotProps.data.txn["amount"],
                      getAssetName(slotProps.data.txn["assetIndex"]),
                      getAssetDecimals(slotProps.data.txn["assetIndex"])
                    )
                  }}
                </div>
              </div>
            </template>
          </Column>
          <Column field="fee" :header="$t('connect.fee')" :sortable="true">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.txn["fee"]) }}
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
                          {{ formatData(txProps.data.txn.note, "Text") }}
                        </td>
                        <td>
                          {{ formatData(txProps.data.txn.note, "UInt") }}
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
                  v-if="txProps.data.type == 'appl' && txProps.data.txn.appArgs"
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
                    txProps.data.type == 'appl' && txProps.data.txn.appAccounts
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
                        v-for="asset in txProps.data.txn.appForeignAssets"
                        :key="asset"
                      >
                        {{ asset }}
                      </li>
                    </ol>
                  </td>
                </tr>
                <tr
                  v-if="txProps.data.type == 'appl' && txProps.data.txn.boxes"
                >
                  <td>{{ $t("connect.boxes") }}:</td>
                  <td>
                    <ol>
                      <li v-for="box in txProps.data.txn.boxes" :key="box.name">
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
                    {{ formatGenesisHash(txProps.data.txn.genesisHash) }}
                  </td>
                </tr>
              </table>
            </div>
          </template>
        </DataTable>
      </template>
    </Card>
  </MainLayout>
</template>

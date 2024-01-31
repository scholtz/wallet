<template>
  <MainLayout>
    <h1>
      {{ $t("assetcreate.title") }}

      <Button
        v-if="!advanced"
        severity="secondary"
        size="small"
        @click="advanced = true"
      >
        {{ $t("assetcreate.show_advanced") }}
      </Button>
      <Button
        v-if="advanced"
        severity="secondary"
        size="small"
        @click="advanced = false"
      >
        {{ $t("assetcreate.hide_advanced") }}
      </Button>
    </h1>

    <label for="assetName" class="m-1">{{ $t("assetcreate.assetName") }}</label>
    <input id="assetName" v-model="asset.assetName" class="form-control m-1" />
    <label for="addr " class="m-1">{{ $t("assetcreate.creator") }} </label>
    <div v-if="!hasPrivate" class="alert alert-danger">
      {{ $t("assetcreate.creator_not_found") }}
    </div>

    <SelectAccount v-if="hasPrivate" v-model="asset.addr"></SelectAccount>
    <div v-if="advanced" class="form-check m-1">
      <input
        id="defaultFrozen"
        v-model="asset.defaultFrozen"
        class="form-check-input"
        type="checkbox"
      />
      <label class="form-check-label" for="defaultFrozen">
        {{ $t("assetcreate.default_fronzen") }}
      </label>
    </div>
    <label v-if="advanced" for="decimals" class="m-1"
      >{{ $t("assetcreate.decimals") }}
    </label>
    <input
      v-if="advanced"
      id="decimals"
      v-model="asset.decimals"
      class="form-control m-1"
      type="number"
      min="0"
      max="18"
      step="1"
    />
    <label for="totalIssuance" class="m-1"
      >{{ $t("assetcreate.totalIssuance") }} (<span title="min">{{ min }}</span>
      - <span title="max">{{ max }}</span
      >)
    </label>
    <input
      id="totalIssuance"
      v-model="asset.totalIssuance"
      class="form-control m-1"
      type="number"
      min="0"
      max="1000000000000"
      step="1"
    />
    <label v-if="advanced" for="unitName" class="m-1"
      >{{ $t("assetcreate.unitName") }}
    </label>
    <input
      v-if="advanced"
      id="unitName"
      v-model="asset.unitName"
      class="form-control m-1"
    />
    <label v-if="advanced" for="assetURL" class="m-1"
      >{{ $t("assetcreate.assetURL") }}
    </label>
    <input
      v-if="advanced"
      id="assetURL"
      v-model="asset.assetURL"
      class="form-control m-1"
    />
    <label v-if="advanced" for="assetMetadataHash" class="m-1"
      >{{ $t("assetcreate.assetMetadataHash") }}
    </label>
    <input
      v-if="advanced"
      id="assetMetadataHash"
      v-model="asset.assetMetadataHash"
      class="form-control m-1"
    />

    <label v-if="advanced" for="manager " class="m-1"
      >{{ $t("assetcreate.manager") }}
    </label>
    <SelectAccount v-if="advanced" v-model="asset.manager"></SelectAccount>

    <label v-if="advanced" for="reserve " class="m-1"
      >{{ $t("assetcreate.reserve") }}
    </label>
    <SelectAccount v-if="advanced" v-model="asset.reserve"></SelectAccount>
    <label v-if="advanced" for="freeze " class="m-1"
      >{{ $t("assetcreate.freeze") }}
    </label>
    <SelectAccount v-if="advanced" v-model="asset.freeze"></SelectAccount>
    <label v-if="advanced" for="clawback " class="m-1"
      >{{ $t("assetcreate.clawback") }}
    </label>
    <SelectAccount v-if="advanced" v-model="asset.clawback"></SelectAccount>
    <label v-if="advanced" for="note" class="m-1"
      >{{ $t("assetcreate.note") }}
    </label>
    <input
      v-if="advanced"
      id="note"
      v-model="asset.note"
      class="form-control m-1"
    />

    <Button
      @click="createAssetMultisig"
      v-if="isMultisig"
      :disabled="
        !this.asset ||
        !this.asset.addr ||
        !this.asset.totalIssuance ||
        !this.asset.assetName
      "
      type="submit"
    >
      {{ $t("assetcreate.create_button") }} - Multisig
    </Button>
    <Button
      @click="createAsset"
      v-else
      :disabled="
        !this.asset ||
        !this.asset.addr ||
        !this.asset.totalIssuance ||
        !this.asset.assetName
      "
      type="submit"
      :value="$t('assetcreate.create_button')"
    >
      {{ $t("assetcreate.create_button") }}
    </Button>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
import SelectAccount from "../../components/SelectAccount.vue";

export default {
  components: {
    MainLayout,
    SelectAccount,
  },
  data() {
    return {
      asset: {
        addr: "",
        note: "",
        totalIssuance: 1,
        decimals: 0,
        defaultFrozen: false,
        manager: "",
        reserve: "",
        freeze: "",
        clawback: "",
        unitName: "",
        assetName: "",
        assetURL: "",
        assetMetadataHash: "",
      },
      advanced: false,
    };
  },
  computed: {
    accountsWithPrivateKey() {
      return this.$store.state.wallet.privateAccounts.filter(
        (a) => !!a.sk || !!a.params || a.type == "ledger" || a.type == "wc"
      );
    },
    hasPrivate() {
      return (
        this.accountsWithPrivateKey && this.accountsWithPrivateKey.length > 0
      );
    },
    min() {
      if (this.asset.decimals == 0) {
        return 1;
      }
      return parseFloat(Math.pow(10, -1 * this.asset.decimals)).toFixed(
        this.asset.decimals
      );
    },
    max() {
      return new Intl.NumberFormat().format(this.asset.totalIssuance);
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.asset.addr
      );
    },
    isMultisig() {
      return !!this.multisigParams;
    },
    rekeyedToInfo() {
      if (!this.account) return;
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.account.rekeyedTo
      );
    },
    multisigParams() {
      if (!this.account) return;
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
  },
  mounted() {
    this.addr = localStorage.getItem("lastUsedWallet");
  },
  methods: {
    ...mapActions({
      makeAssetCreateTxnWithSuggestedParams:
        "algod/makeAssetCreateTxnWithSuggestedParams",
      makeAssetCreateTxnWithSuggestedParamsTx:
        "algod/makeAssetCreateTxnWithSuggestedParamsTx",
      openSuccess: "toast/openSuccess",
    }),
    async createAsset(e) {
      e.preventDefault();
      const asset = await this.makeAssetCreateTxnWithSuggestedParams({
        asset: this.asset,
      });
      if (asset.txId) {
        this.openSuccess("Asset request sent to the network: " + asset.txId);
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
    async createAssetMultisig(e) {
      e.preventDefault();
      const assetCreateTx = await this.makeAssetCreateTxnWithSuggestedParamsTx({
        asset: this.asset,
      });
      const encodedtxn = algosdk.encodeUnsignedTransaction(assetCreateTx);
      const urldataB64 = this._arrayBufferToBase64(encodedtxn);
      const urldataB64url = this.base642base64url(urldataB64);
      const pushTo = `/multisig/${this.asset.addr}/${urldataB64url}`;
      this.$router.push(pushTo);
    },
  },
};
</script>

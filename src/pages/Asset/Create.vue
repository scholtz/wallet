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
    <div class="field grid">
      <label for="assetName" class="col-12 mb-2 md:col-2 md:mb-0">
        {{ $t("assetcreate.assetName") }}
      </label>
      <div class="col-12 md:col-10">
        <InputText id="assetName" v-model="asset.assetName" class="w-full" />
      </div>
    </div>
    <div class="field grid">
      <label for="addr" class="col-12 mb-2 md:col-2 md:mb-0">
        {{ $t("assetcreate.creator") }}
      </label>
      <div class="col-12 md:col-10">
        <Message severity="error" v-if="!hasPrivate">
          {{ $t("assetcreate.creator_not_found") }}
        </Message>

        <SelectAccount
          v-if="hasPrivate"
          v-model="asset.addr"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>

    <div v-if="advanced" class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Checkbox inputId="defaultFrozen" v-model="asset.defaultFrozen" />
        <label for="defaultFrozen" class="ml-1">
          {{ $t("assetcreate.default_fronzen") }}
        </label>
      </div>
    </div>
    <div v-if="advanced" class="field grid">
      <label v-if="advanced" for="decimals" class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.decimals") }}
      </label>
      <div class="col-12 md:col-10">
        <InputNumber
          v-if="advanced"
          inputId="decimals"
          class="w-full"
          v-model="asset.decimals"
          :min="0"
          :max="18"
          :step="1"
          showButtons
        />
      </div>
    </div>
    <div class="field grid">
      <label for="totalIssuance" class="col-12 mb-2 md:col-2 md:mb-0">
        {{ $t("assetcreate.totalIssuance") }}
        ({{ min }}-{{ max }})
      </label>
      <div class="col-12 md:col-10">
        <InputNumber
          inputId="totalIssuance"
          v-model="asset.totalIssuance"
          class="w-full"
          :min="0"
          :max="1000000000000"
          :step="1"
        />
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="unitName" class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.unitName") }}
      </label>
      <div class="col-12 md:col-10">
        <InputText
          v-if="advanced"
          id="unitName"
          v-model="asset.unitName"
          class="w-full"
        />
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="assetURL" class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.assetURL") }}
      </label>
      <div class="col-12 md:col-10">
        <InputText
          v-if="advanced"
          id="assetURL"
          v-model="asset.assetURL"
          class="w-full"
        />
      </div>
    </div>
    <div class="field grid">
      <label
        v-if="advanced"
        for="assetMetadataHash"
        class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.assetMetadataHash") }}
      </label>
      <div class="col-12 md:col-10">
        <InputText
          v-if="advanced"
          id="assetMetadataHash"
          v-model="asset.assetMetadataHash"
          class="w-full"
        />
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="manager " class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.manager") }}
      </label>
      <div class="col-12 md:col-10">
        <SelectAccount
          v-if="advanced"
          v-model="asset.manager"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="reserve " class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.reserve") }}
      </label>
      <div class="col-12 md:col-10">
        <SelectAccount
          v-if="advanced"
          v-model="asset.reserve"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="freeze " class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.freeze") }}
      </label>
      <div class="col-12 md:col-10">
        <SelectAccount
          v-if="advanced"
          v-model="asset.freeze"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>
    <div class="field grid">
      <label
        v-if="advanced"
        for="clawback "
        class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.clawback") }}
      </label>
      <div class="col-12 md:col-10">
        <SelectAccount
          v-if="advanced"
          v-model="asset.clawback"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>
    <div class="field grid">
      <label v-if="advanced" for="note" class="col-12 mb-2 md:col-2 md:mb-0"
        >{{ $t("assetcreate.note") }}
      </label>
      <div class="col-12 md:col-10">
        <InputText
          v-if="advanced"
          id="note"
          v-model="asset.note"
          class="w-full"
        />
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
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
      </div>
    </div>
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
    accountData() {
      if (!this.account.data) return false;
      return this.account.data[this.$store.state.config.env];
    },
    isMultisig() {
      return !!this.multisigParams;
    },
    rekeyedToInfo() {
      if (!this.accountData) return;
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.accountData.rekeyedTo
      );
    },
    multisigParams() {
      if (!this.account) return;
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

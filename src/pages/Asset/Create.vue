<template>
  <MainLayout>
    <form @submit="createAsset">
      <h1>
        {{ $t("assetcreate.title") }}

        <button
          v-if="!advanced"
          class="btn btn-light btn-xs"
          @click="advanced = true"
        >
          {{ $t("assetcreate.show_advanced") }}
        </button>
        <button
          v-if="advanced"
          class="btn btn-light btn-xs"
          @click="advanced = false"
        >
          {{ $t("assetcreate.hide_advanced") }}
        </button>
      </h1>

      <label for="assetName" class="m-1">{{
        $t("assetcreate.assetName")
      }}</label>
      <input
        id="assetName"
        v-model="asset.assetName"
        class="form-control m-1"
      />
      <label for="addr " class="m-1">{{ $t("assetcreate.creator") }} </label>
      <div v-if="!hasPrivate" class="alert alert-danger">
        {{ $t("assetcreate.creator_not_found") }}
      </div>
      <select
        v-if="hasPrivate"
        v-model="asset.addr"
        class="select form-control m-1"
      >
        <option
          v-for="option in accountsWithPrivateKey"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
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
        >{{ $t("assetcreate.totalIssuance") }} (<span title="min">{{
          min
        }}</span>
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
      <select
        v-if="advanced"
        v-model="asset.manager"
        class="select form-control m-1"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label v-if="advanced" for="reserve " class="m-1"
        >{{ $t("assetcreate.reserve") }}
      </label>
      <select
        v-if="advanced"
        v-model="asset.reserve"
        class="select form-control m-1"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label v-if="advanced" for="freeze " class="m-1"
        >{{ $t("assetcreate.freeze") }}
      </label>
      <select
        v-if="advanced"
        v-model="asset.freeze"
        class="select form-control m-1"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label v-if="advanced" for="clawback " class="m-1"
        >{{ $t("assetcreate.clawback") }}
      </label>
      <select
        v-if="advanced"
        v-model="asset.clawback"
        class="select form-control m-1"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label v-if="advanced" for="note" class="m-1"
        >{{ $t("assetcreate.note") }}
      </label>
      <input
        v-if="advanced"
        id="note"
        v-model="asset.note"
        class="form-control m-1"
      />
      <input
        type="submit"
        class="btn btn-primary"
        :value="$t('assetcreate.create_button')"
      />
    </form>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
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
  },
  mounted() {
    console.log("accountsWithPrivateKey", this.accountsWithPrivateKey);
  },
  methods: {
    ...mapActions({
      makeAssetCreateTxnWithSuggestedParams:
        "algod/makeAssetCreateTxnWithSuggestedParams",
      openSuccess: "toast/openSuccess",
    }),
    async createAsset(e) {
      e.preventDefault();
      console.log("asset", this.asset);
      const asset = await this.makeAssetCreateTxnWithSuggestedParams({
        asset: this.asset,
      });
      if (asset.txId) {
        this.openSuccess("Asset request sent to the network: " + asset.txId);
      }
    },
  },
};
</script>

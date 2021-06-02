<template>
  <PublicLayout>
    <form @submit="createAsset">
      <h1>
        {{ $t("assetcreate.title") }}

        <button
          class="btn btn-light btn-xs"
          @click="advanced = true"
          v-if="!advanced"
        >
          Show advanced form
        </button>
        <button
          class="btn btn-light btn-xs"
          @click="advanced = false"
          v-if="advanced"
        >
          Hide advanced form
        </button>
      </h1>

      <label for="assetName" class="m-1"
        >{{ $t("assetcreate.assetName") }} Friendly name of the asset</label
      >
      <input
        v-model="asset.assetName"
        id="assetName"
        class="form-control m-1"
      />
      <label for="addr " class="m-1"
        >{{ $t("assetcreate.addr") }} Asset creation specific parameters // The
        following parameters are asset specific // Throughout the example these
        will be re-used. // We will also change the manager later in the example
      </label>

      <select class="select form-control m-1" v-model="asset.addr">
        <option
          v-for="option in accountsWithPrivateKey"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <div class="form-check m-1" v-if="advanced">
        <input
          class="form-check-input"
          type="checkbox"
          v-model="asset.defaultFrozen"
          id="defaultFrozen"
        />
        <label class="form-check-label" for="defaultFrozen">
          {{ $t("assetcreate.default_fronzen") }} Whether user accounts will
          need to be unfrozen before transacting
        </label>
      </div>
      <label for="decimals" class="m-1" v-if="advanced"
        >{{ $t("assetcreate.decimals") }} integer number of decimals for asset
        unit calculation</label
      >
      <input
        v-if="advanced"
        v-model="asset.decimals"
        id="decimals"
        class="form-control m-1"
        min="0"
        max="6"
        step="1"
      />
      <label for="totalIssuance" class="m-1"
        >{{ $t("assetcreate.totalIssuance") }} total number of this asset
        available for circulation</label
      >
      <input
        v-model="asset.totalIssuance"
        id="totalIssuance"
        class="form-control m-1"
        min="0"
        max="1000000000"
        step="1"
      />
      <label for="unitName" class="m-1" v-if="advanced"
        >{{ $t("assetcreate.unitName") }} Used to display asset units to
        user</label
      >
      <input
        v-model="asset.unitName"
        id="unitName"
        class="form-control m-1"
        v-if="advanced"
      />
      <label for="assetURL" class="m-1" v-if="advanced"
        >{{ $t("assetcreate.assetURL") }} Optional string pointing to a URL
        relating to the asset</label
      >
      <input
        v-model="asset.assetURL"
        id="assetURL"
        class="form-control m-1"
        v-if="advanced"
      />
      <label for="assetMetadataHash" class="m-1" v-if="advanced"
        >{{ $t("assetcreate.assetMetadataHash") }} Optional hash commitment of
        some sort relating to the asset. 32 character length.</label
      >
      <input
        v-if="advanced"
        v-model="asset.assetMetadataHash"
        id="assetMetadataHash"
        class="form-control m-1"
      />

      <label for="manager " class="m-1" v-if="advanced"
        >{{ $t("assetcreate.manager") }} The following parameters are the only
        ones // that can be changed, and they have to be changed // by the
        current manager // Specified address can change reserve, freeze,
        clawback, and manager
      </label>
      <select
        class="select form-control m-1"
        v-model="asset.manager"
        v-if="advanced"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label for="reserve " class="m-1" v-if="advanced"
        >{{ $t("assetcreate.reserve") }} Specified address is considered the
        asset reserve (it has no special privileges, this is only informational)
      </label>
      <select
        class="select form-control m-1"
        v-model="asset.reserve"
        v-if="advanced"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label for="freeze " class="m-1" v-if="advanced"
        >{{ $t("assetcreate.freeze") }} Specified address can freeze or unfreeze
        user asset holdings
      </label>
      <select
        class="select form-control m-1"
        v-model="asset.freeze"
        v-if="advanced"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label for="clawback " class="m-1" v-if="advanced"
        >{{ $t("assetcreate.clawback") }} Specified address can revoke user
        asset holdings and send them to other addresses
      </label>
      <select
        class="select form-control m-1"
        v-model="asset.clawback"
        v-if="advanced"
      >
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name }} - {{ option.addr }}
        </option>
      </select>
      <label for="note" class="m-1" v-if="advanced"
        >{{ $t("assetcreate.note") }} Note set in the create transaction</label
      >
      <input
        v-model="asset.note"
        id="note"
        class="form-control m-1"
        v-if="advanced"
      />
      <input
        type="submit"
        class="btn btn-primary"
        :value="$t('assetcreate.create_button')"
      />
    </form>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../../layouts/Public.vue";
import { mapActions } from "vuex";
export default {
  components: {
    PublicLayout,
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
      return this.$store.state.wallet.privateAccounts.filter((a) => !!a.sk);
    },
  },
  mounted() {
    console.log("accountsWithPrivateKey", this.accountsWithPrivateKey);
  },
  methods: {
    ...mapActions({
      makeAssetCreateTxnWithSuggestedParams:
        "algod/makeAssetCreateTxnWithSuggestedParams",
    }),
    async createAsset(e) {
      e.preventDefault();
      console.log("asset", this.asset);
      const asset = await this.makeAssetCreateTxnWithSuggestedParams({
        asset: this.asset,
      });
      console.log("ret.asset", asset);
    },
  },
};
</script>
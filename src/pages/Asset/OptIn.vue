<template>
  <MainLayout>
    <h1>{{ $t("optin.title") }} {{ account.name }}</h1>
    <form @submit="findAssetClick">
      <div class="form-check m-1">
        <input
          class="form-check-input"
          type="checkbox"
          v-model="searchById"
          id="searchById"
        />
        <label class="form-check-label" for="searchById">
          {{ $t("optin.searchById") }}
        </label>
      </div>
      <div v-if="searchById">
        <label for="assetId">{{ $t("optin.assetId") }}</label>
        <input v-model="assetId" id="assetId" class="form-control" />
      </div>
      <div v-else>
        <label for="assetName">{{ $t("optin.assetName") }}</label>
        <input v-model="assetName" id="assetName" class="form-control" />
      </div>
      <input
        type="submit"
        :value="$t('optin.searchButton')"
        class="btn my-2"
        :class="asset && asset['asset-id'] ? 'btn-light' : 'btn-primary'"
      />
    </form>

    <DataTable
      v-if="assets && assets.length > 0"
      :value="assets"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <Column
        field="index"
        :header="$t('optin.assetId')"
        :sortable="true"
      ></Column>
      <Column
        field="params.name"
        :header="$t('optin.assetName')"
        :sortable="true"
      ></Column>
    </DataTable>

    <Dialog
      :header="$t('optin.dialog_header')"
      v-model:visible="displayOptInDialog"
      :modal="true"
    >
      <p>{{ $t("optin.optin_confirm") }}</p>
      <p v-if="account">
        <b>{{ account.name }}</b>
      </p>
      <p v-if="account">{{ account.addr }}</p>
      <template #footer
        ><button
          v-if="!optInProcessing"
          @click="displayOptInDialog = false"
          class="btn btn-xs btn-light"
        >
          {{ $t("global.cancel") }}</button
        ><button
          v-if="!optInProcessing"
          class="btn btn-xs btn-primary"
          @click="optInConfirmClick"
        >
          {{ $t("optin.optin_confirm_button") }}
        </button></template
      >
    </Dialog>
    <div class="card" v-if="asset && asset['asset-id']">
      <div class="card-header">
        {{ $t("optin.assetInfo") }}
      </div>
      <table class="table">
        <tbody>
          <tr>
            <th>{{ $t("optin.action") }}</th>
            <td>
              <button
                class="btn btn-primary"
                @click="displayOptInDialog = true"
              >
                {{ $t("optin.optin_button") }}
              </button>
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.assetId") }}</th>
            <td>{{ asset["asset-id"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.assetName") }}</th>
            <td>{{ asset["name"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.total") }}</th>
            <td>{{ asset["total"] }} {{ asset["unit-name"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.unit_name") }}</th>
            <td>{{ asset["unit-name"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.decimals") }}</th>
            <td>{{ asset["decimals"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.url") }}</th>
            <td>{{ asset["url"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.metadata_hash") }}</th>
            <td>{{ asset["metadata-hash"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("optin.default_frozen") }}</th>
            <td>
              <div class="form-check m-1">
                <input
                  disabled
                  class="form-check-input"
                  type="checkbox"
                  v-model="asset['default-frozen']"
                  id="defaultFrozen"
                />
                {{
                  asset["default-frozen"] ? $t("global.yes") : $t("global.no")
                }}
              </div>
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.creator") }}</th>
            <td>
              <router-link
                :to="'/account/' + asset['creator']"
                class="btn btn-xs btn-light"
                >{{ asset["creator"] }}</router-link
              >
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.manager") }}</th>
            <td>
              <router-link
                v-if="asset['manager']"
                :to="'/account/' + asset['manager']"
                class="btn btn-xs btn-light"
                >{{ asset["manager"] }}</router-link
              >
              <span v-else>-</span>
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.clawback") }}</th>
            <td>
              <router-link
                v-if="asset['clawback']"
                :to="'/account/' + asset['clawback']"
                class="btn btn-xs btn-light"
                >{{ asset["clawback"] }}</router-link
              >
              <span v-else>-</span>
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.freeze") }}</th>
            <td>
              <router-link
                v-if="asset['freeze']"
                :to="'/account/' + asset['freeze']"
                class="btn btn-xs btn-light"
                >{{ asset["freeze"] }}</router-link
              >
              <span v-else>-</span>
            </td>
          </tr>
          <tr>
            <th>{{ $t("optin.reserve") }}</th>
            <td>
              <router-link
                v-if="asset['reserve']"
                :to="'/account/' + asset['reserve']"
                class="btn btn-xs btn-light"
                >{{ asset["reserve"] }}</router-link
              >
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import { mapActions } from "vuex";

export default {
  components: {
    MainLayout,
  },
  watch: {
    async selection() {
      if (this.selection.index) {
        this.asset = await this.getAsset({ assetIndex: this.selection.index });
      }
    },
  },
  data() {
    return {
      searchById: true,
      assetId: null,
      selection: null,
      assetName: "",
      asset: {},
      assets: [],
      displayOptInDialog: false,
      optInProcessing: false,
    };
  },
  computed: {
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
  },
  methods: {
    ...mapActions({
      getAssetsByName: "indexer/getAssetsByName",
      getAsset: "indexer/getAsset",
      prolong: "wallet/prolong",
      openError: "toast/openError",
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
    }),
    async findAssetClick(e) {
      e.preventDefault();
      this.prolong();
      this.asset = {};
      this.assets = [];
      this.optInProcessing = false;
      if (this.searchById) {
        this.asset = await this.getAsset({ assetIndex: this.assetId });
        if (!this.asset || !this.asset["asset-id"]) {
          this.openError(this.$t("optin.asset_not_found"));
        }
      } else {
        this.assets = await this.getAssetsByName({
          name: this.assetName,
        });
        console.log("this.assets.length", this.assets.length);
        if (this.assets.length === 0) {
          this.openError(this.$t("optin.asset_not_found"));
        }
        if (this.assets.length === 1) {
          this.asset = await this.getAsset({
            assetIndex: this.assets[0].index,
          });
        }
      }
      console.log("asset", this.asset);
    },
    async optInConfirmClick() {
      this.optInProcessing = true;
      const data = {
        payTo: this.account.addr,
        payFrom: this.account.addr,
        amount: 0,
        noteEnc: new Uint8Array([]),
        fee: 1000,
        asset: this.asset["asset-id"],
      };
      console.log("payment.data", data);
      const result = await this.makePayment(data);
      console.log("result", result);
      if (result) {
        this.openSuccess(this.$t("optin.asset_opt_in_success"));
        await this.sleep(2000);
        this.$router.push("/account/" + this.account.addr);
      }
    },
    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
  },
};
</script>
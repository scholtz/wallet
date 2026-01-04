<template>
  <MainLayout>
    <h1>{{ $t("optin.title") }} {{ account.name }}</h1>
    <Card>
      <template #content>
        <form @submit="findAssetClick">
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Checkbox
                binary
                inputId="searchById"
                v-model="searchById"
                type="checkbox"
              />
              <label class="ml-1" for="searchById">
                {{ $t("optin.searchById") }}
              </label>
            </div>
          </div>
          <div class="field grid" v-if="searchById">
            <label for="assetId" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("optin.assetId") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText id="assetId" v-model="assetId" class="w-full" />
            </div>
          </div>
          <div class="field grid" v-else>
            <label for="assetName" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("optin.assetName") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText id="assetName" v-model="assetName" class="w-full" />
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button
                type="submit"
                class="my-2"
                :severity="asset && asset['assetId'] ? 'secondary' : 'primary'"
              >
                {{ $t("optin.searchButton") }}
              </Button>
            </div>
          </div>
        </form>

        <DataTable
          v-if="assets && assets.length > 0"
          v-model:selection="selection"
          :value="assets"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
        >
          <Column
            field="index"
            :header="$t('optin.assetId')"
            :sortable="true"
          />
          <Column
            field="params.name"
            :header="$t('optin.assetName')"
            :sortable="true"
          />
        </DataTable>

        <Dialog
          v-model:visible="displayOptInDialog"
          :header="$t('optin.dialog_header')"
          :modal="true"
        >
          <p>{{ $t("optin.optin_confirm") }}</p>
          <p v-if="account">
            <b>{{ account.name }}</b>
          </p>
          <p v-if="account">
            {{ account.addr }}
          </p>
          <template #footer>
            <Button
              v-if="!optInProcessing"
              severity="secondary"
              size="small"
              @click="displayOptInDialog = false"
            >
              {{ $t("global.cancel") }}
            </Button>
            <Button
              v-if="!optInProcessing && !isMultisig"
              size="small"
              @click="optInConfirmClick"
            >
              {{ $t("optin.optin_confirm_button") }}
            </Button>
            <Button
              v-if="!optInProcessing && isMultisig"
              size="small"
              @click="optInMultisigConfirmClick"
            >
              {{ $t("optin.optin_confirm_button") }} - MultiSig
            </Button>
          </template>
        </Dialog>
        <Panel v-if="asset && asset['assetId']" class="card">
          <template #header>
            {{ $t("optin.assetInfo") }}
          </template>
          <table class="w-100">
            <tbody>
              <tr>
                <th>{{ $t("optin.action") }}</th>
                <td>
                  <Button @click="displayOptInDialog = true">
                    {{ $t("optin.optin_button") }}
                  </Button>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.assetId") }}</th>
                <td>{{ asset["assetId"] }}</td>
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
                      id="defaultFrozen"
                      v-model="asset['default-frozen']"
                      disabled
                      class="form-check-input"
                      type="checkbox"
                    />
                    {{
                      asset["default-frozen"]
                        ? $t("global.yes")
                        : $t("global.no")
                    }}
                  </div>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.creator") }}</th>
                <td>
                  <router-link :to="'/account/' + asset['creator']">
                    <Button size="small" severity="secondary">
                      {{ asset["creator"] }}
                    </Button>
                  </router-link>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.manager") }}</th>
                <td>
                  <router-link
                    v-if="asset['manager']"
                    :to="'/account/' + asset['manager']"
                  >
                    <Button size="small" severity="secondary">
                      {{ asset["manager"] }}
                    </Button>
                  </router-link>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.clawback") }}</th>
                <td>
                  <router-link
                    v-if="asset['clawback']"
                    :to="'/account/' + asset['clawback']"
                  >
                    <Button size="small" severity="secondary">
                      {{ asset["clawback"] }}
                    </Button>
                  </router-link>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.freeze") }}</th>
                <td>
                  <router-link
                    v-if="asset['freeze']"
                    :to="'/account/' + asset['freeze']"
                  >
                    <Button size="small" severity="secondary">
                      {{ asset["freeze"] }}
                    </Button>
                  </router-link>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr>
                <th>{{ $t("optin.reserve") }}</th>
                <td>
                  <router-link
                    v-if="asset['reserve']"
                    :to="'/account/' + asset['reserve']"
                  >
                    <Button size="small" severity="secondary">
                      {{ asset["reserve"] }}
                    </Button>
                  </router-link>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </template>
    </Card>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import { mapActions } from "vuex";
//import base64url from "base64url";
import algosdk from "algosdk";

export default {
  components: {
    MainLayout,
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
    accountData() {
      if (!this.account) return false;
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
  watch: {
    async selection() {
      if (this.selection.index) {
        this.asset = await this.getAsset({ assetIndex: this.selection.index });
      }
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
      preparePayment: "algod/preparePayment",
    }),
    async findAssetClick(e) {
      e.preventDefault();
      this.prolong();
      this.asset = {};
      this.assets = [];
      this.optInProcessing = false;
      if (this.searchById) {
        this.asset = await this.getAsset({ assetIndex: this.assetId });
        if (!this.asset || !this.asset["assetId"]) {
          this.openError(this.$t("optin.asset_not_found"));
        }
      } else {
        this.assets = await this.getAssetsByName({
          name: this.assetName,
        });
        if (this.assets.length === 0) {
          this.openError(this.$t("optin.asset_not_found"));
        }
        if (this.assets.length === 1) {
          this.asset = await this.getAsset({
            assetIndex: this.assets[0].index,
          });
        }
      }
    },
    async optInConfirmClick() {
      this.optInProcessing = true;
      const data = {
        payTo: this.account.addr,
        payFrom: this.account.addr,
        amount: 0,
        noteEnc: new Uint8Array([]),
        fee: 1000,
        asset: this.asset["assetId"],
      };
      const result = await this.makePayment(data);
      if (result) {
        this.openSuccess(this.$t("optin.asset_opt_in_success"));
        await this.sleep(2000);
        this.$router.push("/account/" + this.account.addr);
      }
    },
    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    async optInMultisigConfirmClick() {
      this.optInProcessing = true;
      const data = {
        payTo: this.account.addr,
        payFrom: this.account.addr,
        amount: 0,
        noteEnc: new Uint8Array([]),
        fee: 1000,
        asset: this.asset["assetId"],
      };
      const txn = await this.preparePayment(data);
      const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
      const urldataB64 = this._arrayBufferToBase64(encodedtxn);
      const urldataB64url = this.base642base64url(urldataB64);
      const pushTo = `/multisig/${this.$route.params.account}/${urldataB64url}`;
      this.$router.push(pushTo);
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
      return input
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
    },
  },
};
</script>
<style scoped>
td,
th {
  padding: 5px;
}
</style>

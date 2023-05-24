<template>
  <PublicLayout>
    <div class="container-fluid">
      <h1>ARC14 developer page</h1>
      <p>
        On this page developers can create ARC14 signed message and use it in
        swaggers.
      </p>
      <p>
        Note that ARC14 requires selection of the network. Make sure that you
        are using same network as destination service.
      </p>
      <div>
        <h2>Service realm</h2>
        <input
          id="realm"
          v-model="realm"
          class="form-control"
          placeholder="Service realm. For example 2FA#ARC14"
        />
        <div>
          <button
            class="btn my-2 btn-primary"
            :disabled="processingSigning"
            @click="clickSign"
          >
            Sign authentication transaction
            <span
              v-if="processingSigning"
              class="spinner-grow spinner-grow-sm"
              role="status"
              aria-hidden="true"
            />
          </button>
        </div>
        <div>
          <textarea v-model="output" disabled class="form-control" rows="5" />
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import { mapActions } from "vuex";

export default {
  components: {
    PublicLayout,
  },
  data() {
    return {
      processingSigning: false,
      output: "",
      realm: "",
    };
  },
  async mounted() {
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
      getSK: "wallet/getSK",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      signAuthTx: "arc14/signAuthTx",
    }),
    async clickSign() {
      try {
        this.processingSigning = true;
        this.output = await this.signAuthTx({
          account: this.$route.params.account,
          realm: this.realm,
        });
      } catch (e) {
        console.error(e);
      }
      this.processingSigning = false;
    },
  },
};
</script>

<template>
  <MainLayout>
    <h1>ARC14 developer page</h1>

    <Card>
      <template #content>
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
          <InputText
            id="realm"
            v-model="realm"
            class="w-full"
            placeholder="Service realm. For example 2FA#ARC14"
          />
          <div>
            <Button
              class="my-2"
              :disabled="processingSigning"
              @click="clickSign"
            >
              <ProgressSpinner
                style="width: 1em; height: 1em"
                strokeWidth="5"
              />
              Sign authentication transaction
            </Button>
          </div>
          <div>
            <Textarea v-model="output" disabled class="w-full" rows="5" />
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";

export default {
  components: {
    MainLayout,
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

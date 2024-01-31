<template>
  <PublicLayout>
    <div class="d-flex align-items-center justify-content-center h-100">
      <Panel class="w-25">
        <template #header>
          {{ $t("import.title") }}
        </template>

        <form @submit="createWalletClick">
          <label for="newwallet-name">{{ $t("import.wallet_name") }}</label>
          <input id="newwallet-name" v-model="name" class="form-control my-2" />
          <label for="newwallet-file">{{ $t("import.wallet_file") }}</label>
          <input
            id="newwallet-file"
            ref="walletFile"
            type="file"
            class="form-control my-2"
            @change="fileChanged"
          />
          <Button type="submit" :disabled="!name || !file">
            {{ $t("import.import_wallet_button") }}
          </Button>
          <RouterLink to="/">
            <Button variant="secondary" class="mx-2">
              {{ $t("global.go_home") }}
            </Button>
          </RouterLink>
          <p class="my-2">
            {{ $t("import.help") }}
          </p>
        </form>
      </Panel>
    </div>
  </PublicLayout>
</template>

<script>
import { mapActions } from "vuex";
import PublicLayout from "../layouts/Public.vue";
import { RouterLink } from "vue-router";
export default {
  components: {
    PublicLayout,
    RouterLink,
  },
  data() {
    return {
      name: "",
      file: null,
    };
  },
  methods: {
    ...mapActions({
      importWallet: "wallet/importWallet",
    }),
    fileChanged() {
      this.readFile(this.$refs.walletFile.files[0]);
    },
    readFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        //this.file = btoa(unescape(encodeURIComponent(e.target.result)));
        this.file = e.target.result;
      };
      reader.readAsText(file);
    },
    createWalletClick(e) {
      e.preventDefault();

      this.importWallet({ name: this.name, data: this.file }).then((r) => {
        if (r) {
          this.$router.push("/accounts");
        }
      });
    },
  },
};
</script>

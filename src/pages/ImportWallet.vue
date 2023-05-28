<template>
  <PublicLayout>
    <div class="d-flex align-items-center justify-content-center h-100">
      <div class="card w-25">
        <div class="card-header">
          {{ $t("import.title") }}
        </div>
        <div class="card-body">
          <form @submit="createWalletClick">
            <label for="newwallet-name">{{ $t("import.wallet_name") }}</label>
            <input
              id="newwallet-name"
              v-model="name"
              class="form-control my-2"
            />
            <label for="newwallet-file">{{ $t("import.wallet_file") }}</label>
            <input
              id="newwallet-file"
              ref="walletFile"
              type="file"
              class="form-control my-2"
              @change="fileChanged"
            />
            <input
              type="submit"
              class="btn btn-primary"
              :value="$t('import.import_wallet_button')"
              :disabled="!name || !file"
            />
            <router-link to="/" class="btn btn-light mx-2">
              {{ $t("global.go_home") }}
            </router-link>
            <p class="my-2">
              {{ $t("import.help") }}
            </p>
          </form>
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<script>
import { mapActions } from "vuex";
import PublicLayout from "../layouts/Public.vue";
export default {
  components: {
    PublicLayout,
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
      //console.log("this.$refs.walletFile.files", this.$refs.walletFile.files);
      console.log("this.file", this.file);
      this.readFile(this.$refs.walletFile.files[0]);
    },
    readFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        //this.file = btoa(unescape(encodeURIComponent(e.target.result)));
        this.file = e.target.result;
        console.log("this.file", this.file);
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

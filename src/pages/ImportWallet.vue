<template>
  <PublicLayout
    ><div class="d-flex align-items-center justify-content-center h-100">
      <div class="card w-25">
        <div class="card-header">Import wallet</div>
        <div class="card-body">
          <form @submit="createWalletClick">
            <label for="newwallet-name">Wallet name</label>
            <input
              v-model="name"
              id="newwallet-name"
              class="form-control my-2"
            />
            <label for="newwallet-file">Wallet file</label>
            <input
              id="newwallet-file"
              type="file"
              class="form-control my-2"
              ref="walletFile"
              @change="fileChanged"
            />
            <input
              type="submit"
              class="btn btn-primary"
              value="Import wallet"
              :disabled="!name || !file"
            />
            <a href="/" class="btn btn-light mx-2">Go home</a>
            <p class="my-2">
              You can import previously exported wallets. Wallet password stays
              within the exported file, so you can access it after the import
              with the same password as before. You can change the password
              after login from the settings page.
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
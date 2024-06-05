<template>
  <PublicLayout>
    <div
      class="flex flex-column align-items-center justify-content-center h-full m-2"
    >
      <Panel class="col-12 md:col-8 lg:col-6">
        <template #header>
          {{ $t("import.title") }}
        </template>

        <form @submit="createWalletClick">
          <div class="field grid">
            <label for="newwallet-name" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("import.wallet_name") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText id="newwallet-name" v-model="name" class="w-full" />
            </div>
          </div>
          <div class="field grid">
            <label for="newwallet-file" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("import.wallet_file") }}
            </label>
            <div class="col-12 md:col-10">
              <FileUpload
                mode="basic"
                id="newwallet-file"
                ref="walletFile"
                type="file"
                @change="fileChanged"
              />
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
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
            </div>
          </div>
        </form>
      </Panel>
    </div>
  </PublicLayout>
</template>

<script>
import { mapActions } from "vuex";
import PublicLayout from "../../layouts/Public.vue";
import { RouterLink } from "vue-router";
import FileUpload from "primevue/fileupload";

export default {
  components: {
    PublicLayout,
    RouterLink,
    FileUpload,
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

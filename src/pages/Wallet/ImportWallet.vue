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
                type="file"
                @select="fileChanged"
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

<script lang="ts" setup>
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import FileUpload, { type FileUploadSelectEvent } from "primevue/fileupload";
import PublicLayout from "../../layouts/Public.vue";
import { useStore } from "../../store";

const store = useStore();
const router = useRouter();

const name = ref("");
const file = ref<string | null>(null);

const readFile = (uploadedFile: File) => {
  const reader = new FileReader();
  reader.onload = (event: ProgressEvent<FileReader>) => {
    const result = event.target?.result;
    file.value = typeof result === "string" ? result : null;
  };
  reader.readAsText(uploadedFile);
};

const toFileArray = (
  files: File | File[] | ArrayLike<File> | null | undefined
): File[] => {
  if (!files) {
    return [];
  }
  if (Array.isArray(files)) {
    return files;
  }
  if (files instanceof File) {
    return [files];
  }
  return Array.from(files as ArrayLike<File>);
};

const fileChanged = (event: FileUploadSelectEvent) => {
  const [firstFile] = toFileArray(
    event.files as File | File[] | ArrayLike<File> | null
  );

  if (firstFile) {
    readFile(firstFile);
  } else {
    file.value = null;
  }
};

const createWalletClick = async (event: Event) => {
  event.preventDefault();

  if (!name.value || !file.value) {
    return;
  }

  const result = await store.dispatch("wallet/importWallet", {
    name: name.value,
    data: file.value,
  });

  if (result) {
    router.push("/accounts");
  }
};
</script>

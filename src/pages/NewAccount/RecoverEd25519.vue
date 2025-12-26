<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { QrcodeStream } from "qrcode-reader-vue3";
import { RootState } from "@/store";
import { useI18n } from "vue-i18n";

interface RecoverState {
  addr: string;
  name: string;
  w: string;
  scanMnemonic: boolean;
}

const store = useStore<RootState>();
const router = useRouter();
const { t } = useI18n();

const state = reactive<RecoverState>({
  addr: "",
  name: "",
  w: "",
  scanMnemonic: false,
});

const reset = async () => {
  state.name = "";
  state.addr = "";

  await store.dispatch("wallet/prolong");
  router.push({ name: "Accounts" });
};

async function importAccountClick() {
  try {
    const added = (await store.dispatch("wallet/addPrivateAccount", {
      mn: state.w,
      name: state.name,
    })) as boolean;
    if (added) {
      router.push({ name: "Accounts" });
    }
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}
onMounted(async () => {
  await store.dispatch("wallet/prolong");
});
const onDecodeQRMnemonic = (result: string) => {
  if (result) {
    state.w = result;
  }
};
</script>
<template>
  <MainLayout>
    <h1>{{ t("newacc.import_account") }}</h1>

    <Card>
      <template #content>
        <div class="grid">
          <div :class="state.scanMnemonic ? 'col-8' : 'col-12'">
            <div class="field grid">
              <label for="mn" class="col-12 mb-2 md:col-2 md:mb-0">
                {{ t("newacc.write_mnemonic") }}
              </label>
              <div class="col-12 md:col-10">
                <Password
                  inputId="mn"
                  v-model="state.w"
                  inputClass="w-full"
                  class="w-full"
                  :feedback="false"
                  :toggleMask="true"
                  autocomplete="off"
                />
              </div>
            </div>
            <div class="field grid">
              <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
                {{ t("newacc.name") }}
              </label>
              <div class="col-12 md:col-10">
                <InputText id="name" v-model="state.name" class="w-full" />
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
              <div class="col-12 md:col-10">
                <Button class="m-1" @click="importAccountClick">
                  {{ t("newacc.import_account") }}
                </Button>

                <Button
                  severity="secondary"
                  v-if="!state.scanMnemonic"
                  class="m-1"
                  @click="state.scanMnemonic = true"
                >
                  {{ t("newacc.scan") }}
                </Button>
                <Button
                  severity="secondary"
                  v-if="state.scanMnemonic"
                  class="m-1"
                  @click="state.scanMnemonic = false"
                >
                  {{ t("global.stop_camera") }}
                </Button>
                <Button severity="secondary" class="m-1" @click="reset">
                  {{ t("global.go_back") }}
                </Button>
              </div>
            </div>
          </div>
          <div v-if="state.scanMnemonic" class="col-4">
            <QrcodeStream @decode="onDecodeQRMnemonic" />
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

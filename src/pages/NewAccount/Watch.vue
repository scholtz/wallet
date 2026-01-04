<script setup lang="ts">
import { RootState } from "@/store";
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const state = reactive({
  addr: "",
  name: "",
});

const reset = async () => {
  state.name = "";
  state.addr = "";

  await store.dispatch("wallet/prolong");
  router.push({ name: "Accounts" });
};

const store = useStore<RootState>();
const router = useRouter();

async function watchAccountClick() {
  try {
    await store.dispatch("wallet/addPublicAccount", {
      name: state.name,
      addr: state.addr,
    });
    router.push({ name: "Accounts" });
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}
onMounted(async () => {
  await store.dispatch("wallet/prolong");
});
</script>
<template>
  <MainLayout>
    <h1>{{ t("newacc.watch_account") }}</h1>

    <Card>
      <template #content>
        <div class="field grid">
          <label for="address" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("newacc.address") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText id="address" v-model="state.addr" class="w-full" />
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
          <label for="address" class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button severity="primary" class="my-1" @click="watchAccountClick">
              {{ t("newacc.watch_account") }}
            </Button>
            <Button severity="secondary" class="m-1" @click="reset">
              {{ t("global.go_back") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

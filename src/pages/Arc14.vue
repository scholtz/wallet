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
          {{ $t("arc14.network_note") }}
        </p>
        <div>
          <h2>{{ $t("arc14.service_realm_title") }}</h2>
          <InputText
            id="realm"
            v-model="realm"
            class="w-full"
            :placeholder="$t('placeholders.service_realm')"
          />
          <div>
            <Button
              class="my-2"
              :disabled="processingSigning"
              @click="clickSign"
            >
              <ProgressSpinner
                v-if="processingSigning"
                style="width: 1em; height: 1em"
                strokeWidth="5"
              />
              Sign authentication transaction
            </Button>
          </div>
          <div>
            <Textarea v-model="output" disabled class="w-full" rows="5" />
          </div>
          <div v-if="output">
            <Button class="my-2" @click="copyToClipboard">
              {{ $t("arc14.copy_token_to_dashboard") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import MainLayout from "../layouts/Main.vue";
import { useStore } from "../store";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";

const store = useStore();
const route = useRoute();
const toast = useToast();
const { t } = useI18n();

const processingSigning = ref(false);
const output = ref("");
const realm = ref("");

const prolong = () => store.dispatch("wallet/prolong");

const clickSign = async () => {
  try {
    processingSigning.value = true;
    output.value = await store.dispatch("arc14/signAuthTx", {
      account: route.params.account,
      realm: realm.value,
    });
  } catch (error) {
    console.error(error);
  } finally {
    processingSigning.value = false;
  }
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    toast.add({
      severity: "info",
      summary: t("global.copied"),
      detail: t("arc14.token_copied_to_clipboard"),
      life: 2000,
    });
  } catch (error) {
    console.error("Failed to copy: ", error);
  }
};

onMounted(() => {
  void prolong();
});
</script>

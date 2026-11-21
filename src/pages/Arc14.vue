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
import { scheduleClipboardClear } from "@/scripts/clipboard";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { useSignAllHandoff } from "@/composables/useSignAllHandoff";
import { ARC14_NOTE_SUFFIX } from "@/scripts/encoding/arc14";
import { resolveArc14AuthRoute } from "@/scripts/signing/complexSigning";

const store = useStore();
const route = useRoute();
const handoff = useSignAllHandoff();
const toast = useToast();
const { t } = useI18n();

const processingSigning = ref(false);
const output = ref("");
const realm = ref("");

const prolong = () => store.dispatch("wallet/prolong");

const account = () => String(route.params.account ?? "");

const clickSign = async () => {
  try {
    processingSigning.value = true;
    const type = await handoff.getSignerType(account());
    // Multisig / 2FA and Ledger accounts sign the login on the Sign-all page (never sent to the
    // network); it is kept in the wallet, so an already stored valid one is shown at once.
    if (resolveArc14AuthRoute(type) === "signAll") {
      if (!realm.value.endsWith(ARC14_NOTE_SUFFIX)) {
        await store.dispatch("toast/openError", t("arc14.realm_required"));
        return;
      }
      const stored = await handoff.getArc14Auth(account(), realm.value);
      if (stored) {
        output.value = stored;
        return;
      }
      await handoff.requestArc14Auth(
        account(),
        realm.value,
        "Arc14",
        `${route.path}?realm=${encodeURIComponent(realm.value)}`,
      );
      return;
    }
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
    scheduleClipboardClear(output.value);
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

onMounted(async () => {
  void prolong();
  // Back from the Sign-all page: the login that was signed there is kept in the store.
  const returned = route.query.realm;
  if (typeof returned === "string" && returned) {
    realm.value = returned;
    const stored = await handoff.getArc14Auth(account(), returned);
    if (stored) output.value = stored;
  }
});
</script>

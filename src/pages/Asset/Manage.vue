<template>
  <MainLayout>
    <h1 data-testid="asset-manage-title">
      {{ t("asset_manage.title") }}
      <template v-if="asset">
        - {{ asset.name || asset.unitName || asset.assetId.toString() }}
      </template>
    </h1>

    <Message v-if="!assetId" severity="error" data-testid="asset-manage-error">
      {{ t("asset_manage.invalid_asset_id") }}
    </Message>
    <div v-else-if="loading" class="my-3">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>
    <Message
      v-else-if="loadError"
      severity="error"
      data-testid="asset-manage-error"
    >
      {{ loadError }}
    </Message>

    <template v-else-if="asset">
      <Card class="mb-3">
        <template #content>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t("asset_manage.asset_id") }}
            </label>
            <div class="col-12 md:col-9" data-testid="asset-manage-id">
              {{ asset.assetId.toString() }}
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t("asset_manage.name") }}
            </label>
            <div class="col-12 md:col-9">
              {{ asset.name }}
              <span v-if="asset.unitName">({{ asset.unitName }})</span>
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t("asset_manage.total") }}
            </label>
            <div class="col-12 md:col-9">
              {{ formatAssetAmount(asset.total, asset.decimals) }}
              ({{ t("asset_manage.decimals", { decimals: asset.decimals }) }})
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t("asset_manage.default_frozen") }}
            </label>
            <div class="col-12 md:col-9">
              {{
                asset.defaultFrozen
                  ? t("asset_manage.yes")
                  : t("asset_manage.no")
              }}
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t("asset_manage.creator") }}
            </label>
            <div class="col-12 md:col-9">
              <AlgorandAddress :address="asset.creator" />
              <span
                v-if="walletName(asset.creator)"
                class="ml-2 text-color-secondary"
              >
                ({{ walletName(asset.creator) }})
              </span>
            </div>
          </div>
          <div v-for="role in ASSET_ROLES" :key="role" class="field grid">
            <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
              {{ t(`asset_manage.role_${role}`) }}
            </label>
            <div
              class="col-12 md:col-9"
              :data-testid="`asset-manage-role-${role}`"
            >
              <template v-if="asset.roles[role]">
                <AlgorandAddress :address="asset.roles[role]" />
                <span
                  v-if="walletName(asset.roles[role])"
                  class="ml-2 text-color-secondary"
                >
                  ({{ walletName(asset.roles[role]) }})
                </span>
              </template>
              <span v-else class="text-color-secondary">
                {{ t("asset_manage.role_disabled") }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-3">
            <template v-for="item in ASSET_ACTIONS" :key="item">
              <RouterLink
                v-if="actionSender(asset, item)"
                :to="assetActionPath(asset.assetId, item)"
              >
                <Button
                  :severity="item === action ? undefined : 'secondary'"
                  :data-testid="`asset-manage-action-${item}`"
                >
                  <i :class="actionIcon(item)" class="mr-2" />
                  {{ t(`asset_manage.action_${item}`) }}
                </Button>
              </RouterLink>
              <!-- A disabled action is no link either: it must not be reachable with the keyboard. -->
              <Button
                v-else
                severity="secondary"
                disabled
                :data-testid="`asset-manage-action-${item}`"
              >
                <i :class="actionIcon(item)" class="mr-2" />
                {{ t(`asset_manage.action_${item}`) }}
              </Button>
            </template>
          </div>
        </template>
      </Card>

      <Card v-if="action">
        <template #title>{{ t(`asset_manage.action_${action}`) }}</template>
        <template #content>
          <p class="mt-0">{{ t(`asset_manage.help_${action}`) }}</p>

          <Message
            v-if="!sender"
            severity="warn"
            data-testid="asset-manage-role-missing"
          >
            {{ t("asset_manage.role_missing", { role: roleLabel }) }}
          </Message>
          <template v-else>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0 font-bold">
                {{ t("asset_manage.signed_by") }}
              </label>
              <div class="col-12 md:col-9">
                <AlgorandAddress :address="sender" />
                <span
                  v-if="walletName(sender)"
                  class="ml-2 text-color-secondary"
                >
                  ({{ walletName(sender) }})
                </span>
              </div>
            </div>
            <Message
              v-if="signingRoute === 'none'"
              severity="error"
              data-testid="asset-manage-no-signer"
            >
              {{ t("asset_manage.no_signer", { role: roleLabel }) }}
            </Message>
            <Message
              v-else-if="signingRoute === 'signAll'"
              severity="info"
              data-testid="asset-manage-sign-all-info"
            >
              {{ t("asset_manage.sign_all_info") }}
            </Message>
          </template>

          <!-- Freeze / unfreeze -->
          <template v-if="action === 'freeze' && canAct">
            <div class="field grid">
              <label for="freezeTarget" class="col-12 mb-2 md:col-3 md:mb-0">
                {{ t("asset_manage.holder") }}
              </label>
              <div class="col-12 md:col-9">
                <InputText
                  id="freezeTarget"
                  v-model="freezeTarget"
                  class="w-full"
                  data-testid="freeze-target"
                />
              </div>
            </div>
            <div v-if="freezeHolding" class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0">
                {{ t("asset_manage.holder_state") }}
              </label>
              <div class="col-12 md:col-9" data-testid="freeze-holder-state">
                <template v-if="freezeHolding.optedIn">
                  {{ formatAssetAmount(freezeHolding.amount, asset.decimals) }}
                  -
                  {{
                    freezeHolding.frozen
                      ? t("asset_manage.state_frozen")
                      : t("asset_manage.state_not_frozen")
                  }}
                </template>
                <template v-else>{{
                  t("asset_manage.problem_not_opted_in")
                }}</template>
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
              <div class="col-12 md:col-9 flex flex-wrap gap-2">
                <Button
                  severity="warn"
                  :disabled="locked || !!freezeProblem(true)"
                  data-testid="freeze-submit"
                  @click="submitFreeze(true)"
                >
                  <i class="pi pi-lock mr-2" />
                  {{ t("asset_manage.freeze_button") }}
                </Button>
                <Button
                  :disabled="locked || !!freezeProblem(false)"
                  data-testid="unfreeze-submit"
                  @click="submitFreeze(false)"
                >
                  <i class="pi pi-lock-open mr-2" />
                  {{ t("asset_manage.unfreeze_button") }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Clawback -->
          <template v-if="action === 'clawback' && canAct">
            <div class="field grid">
              <label for="clawbackTarget" class="col-12 mb-2 md:col-3 md:mb-0">
                {{ t("asset_manage.clawback_from") }}
              </label>
              <div class="col-12 md:col-9">
                <InputText
                  id="clawbackTarget"
                  v-model="clawbackTarget"
                  class="w-full"
                  data-testid="clawback-target"
                />
                <small
                  v-if="clawbackTargetHolding?.optedIn"
                  data-testid="clawback-target-balance"
                >
                  {{
                    t("asset_manage.balance", {
                      amount: formatAssetAmount(
                        clawbackTargetHolding.amount,
                        asset.decimals,
                      ),
                    })
                  }}
                </small>
              </div>
            </div>
            <div class="field grid">
              <label
                for="clawbackReceiver"
                class="col-12 mb-2 md:col-3 md:mb-0"
              >
                {{ t("asset_manage.clawback_to") }}
              </label>
              <div class="col-12 md:col-9">
                <InputText
                  id="clawbackReceiver"
                  v-model="clawbackReceiver"
                  class="w-full"
                  data-testid="clawback-receiver"
                />
              </div>
            </div>
            <div class="field grid">
              <label for="clawbackAmount" class="col-12 mb-2 md:col-3 md:mb-0">
                {{ t("asset_manage.amount") }}
              </label>
              <div class="col-12 md:col-9">
                <InputGroup>
                  <InputText
                    id="clawbackAmount"
                    v-model="clawbackAmount"
                    inputmode="decimal"
                    data-testid="clawback-amount"
                  />
                  <Button
                    severity="secondary"
                    :disabled="!clawbackTargetHolding?.optedIn"
                    data-testid="clawback-max"
                    @click="setClawbackMax"
                  >
                    {{ t("asset_manage.max") }}
                  </Button>
                </InputGroup>
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
              <div class="col-12 md:col-9">
                <Button
                  severity="danger"
                  :disabled="locked || !!clawbackProblem"
                  data-testid="clawback-submit"
                  @click="submitClawback"
                >
                  <i class="pi pi-replay mr-2" />
                  {{ t("asset_manage.clawback_button") }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Change addresses -->
          <template v-if="action === 'modify' && canAct">
            <div v-for="role in ASSET_ROLES" :key="role" class="field grid">
              <label
                :for="`modify-${role}`"
                class="col-12 mb-2 md:col-3 md:mb-0"
              >
                {{ t(`asset_manage.role_${role}`) }}
              </label>
              <div class="col-12 md:col-9">
                <InputText
                  :id="`modify-${role}`"
                  v-model="modifyRoles[role]"
                  class="w-full"
                  :disabled="!asset.roles[role]"
                  :placeholder="t('asset_manage.role_disabled')"
                  :data-testid="`modify-${role}`"
                />
                <small v-if="!asset.roles[role]">
                  {{ t("asset_manage.role_cannot_restore") }}
                </small>
              </div>
            </div>
            <Message
              v-if="configCheck.cleared.length"
              severity="warn"
              data-testid="modify-cleared-warning"
            >
              {{
                t("asset_manage.clear_warning", {
                  roles: configCheck.cleared
                    .map((r) => t(`asset_manage.role_${r}`))
                    .join(", "),
                })
              }}
              <template v-if="configCheck.managerCleared">
                {{ t("asset_manage.clear_manager_warning") }}
              </template>
            </Message>
            <div
              v-if="configCheck.cleared.length && !configCheck.allCleared"
              class="field grid"
            >
              <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
              <div class="col-12 md:col-9">
                <Checkbox
                  v-model="modifyConfirmClear"
                  inputId="modifyConfirmClear"
                  binary
                  data-testid="modify-confirm-clear"
                />
                <label for="modifyConfirmClear" class="ml-2">
                  {{ t("asset_manage.clear_confirm") }}
                </label>
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
              <div class="col-12 md:col-9">
                <Button
                  :disabled="locked || !!modifyProblem"
                  data-testid="modify-submit"
                  @click="submitModify"
                >
                  <i class="pi pi-save mr-2" />
                  {{ t("asset_manage.modify_button") }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Destroy -->
          <template v-if="action === 'destroy' && canAct">
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0">
                {{ t("asset_manage.creator_holds") }}
              </label>
              <div
                class="col-12 md:col-9"
                data-testid="destroy-creator-holding"
              >
                <template v-if="creatorHolding">
                  {{ formatAssetAmount(creatorHolding.amount, asset.decimals) }}
                  /
                  {{ formatAssetAmount(asset.total, asset.decimals) }}
                </template>
              </div>
            </div>
            <template v-if="!destroyProblem">
              <Message severity="warn">
                {{ t("asset_manage.destroy_warning") }}
              </Message>
              <div class="field grid">
                <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
                <div class="col-12 md:col-9">
                  <Checkbox
                    v-model="destroyConfirm"
                    inputId="destroyConfirm"
                    binary
                    data-testid="destroy-confirm"
                  />
                  <label for="destroyConfirm" class="ml-2">
                    {{ t("asset_manage.destroy_confirm") }}
                  </label>
                </div>
              </div>
            </template>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-3 md:mb-0"></label>
              <div class="col-12 md:col-9">
                <Button
                  severity="danger"
                  :disabled="locked || !!destroyProblem || !destroyConfirm"
                  data-testid="destroy-submit"
                  @click="submitDestroy"
                >
                  <i class="pi pi-trash mr-2" />
                  {{ t("asset_manage.destroy_button") }}
                </Button>
              </div>
            </div>
          </template>

          <Message
            v-if="canAct && currentProblem"
            severity="secondary"
            data-testid="asset-manage-problem"
          >
            {{ t(`asset_manage.problem_${currentProblem}`) }}
          </Message>
          <Message
            v-if="lastTxId"
            :severity="lastConfirmed ? 'success' : 'warn'"
            data-testid="asset-manage-sent"
          >
            {{
              t(
                lastConfirmed ? "asset_manage.confirmed" : "asset_manage.sent",
                {
                  txId: lastTxId,
                },
              )
            }}
          </Message>
          <Message
            v-if="unconfirmedTxId"
            severity="warn"
            data-testid="asset-manage-unconfirmed"
          >
            {{ t("asset_manage.unconfirmed_hint") }}
            <Button
              class="ml-2"
              size="small"
              :disabled="busy"
              data-testid="asset-manage-check-again"
              @click="checkAgain"
            >
              {{ t("asset_manage.check_again") }}
            </Button>
          </Message>
        </template>
      </Card>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import MainLayout from "@/layouts/Main.vue";
import AlgorandAddress from "@/components/AlgorandAddress.vue";
import { useStore } from "@/store";
import { useSignAllHandoff } from "@/composables/useSignAllHandoff";
import type { SigningRoute } from "@/scripts/signing/complexSigning";
import {
  ASSET_ACTIONS,
  ASSET_ROLES,
  actionRole,
  actionSender,
  assertAssetManagementTxnSafe,
  assetActionPath,
  buildAssetClawbackTxn,
  buildAssetConfigTxn,
  buildAssetDestroyTxn,
  buildAssetFreezeTxn,
  checkClawback,
  checkConfigChange,
  checkDestroy,
  checkFreeze,
  formatAssetAmount,
  isConfigChangeAllowed,
  parseAssetAction,
  parseAssetAmount,
  parseAssetId,
  type AssetAction,
  type AssetHolding,
  type AssetRoles,
  type ManagedAsset,
  UnsafeTransactionError,
} from "@/scripts/assets/management";

const props = defineProps<{ action?: string; assetId?: string }>();

const store = useStore();
const router = useRouter();
const { t } = useI18n();
const { signingRouteFor, handOffToSignAll } = useSignAllHandoff();

const assetId = computed(() => parseAssetId(props.assetId));
const action = computed(() => parseAssetAction(props.action));

const asset = ref<ManagedAsset>();
const loading = ref(false);
const loadError = ref("");
const busy = ref(false);
/**
 * Set after a send that was not confirmed: it may still confirm, so the actions stay locked
 * until the user checked again (a second, distinct transaction could otherwise repeat it).
 */
const unconfirmedTxId = ref("");
const locked = computed(() => busy.value || !!unconfirmedTxId.value);
const lastTxId = ref("");
const lastConfirmed = ref(false);
const signingRoute = ref<SigningRoute>();

const sender = computed(() =>
  asset.value && action.value
    ? actionSender(asset.value, action.value)
    : undefined,
);
const roleLabel = computed(() =>
  action.value ? t(`asset_manage.role_${actionRole(action.value)}`) : "",
);
/** The role address can sign (in place or on Sign-all), so the action form is offered. */
const canAct = computed(
  () => !!sender.value && !!signingRoute.value && signingRoute.value !== "none",
);

const walletName = (addr: string | undefined): string | undefined => {
  if (!addr) return undefined;
  const account = store.state.wallet.privateAccounts.find(
    (a) => a.addr === addr,
  );
  return account?.name || undefined;
};

const actionIcon = (item: AssetAction): string => {
  switch (item) {
    case "freeze":
      return "pi pi-lock";
    case "clawback":
      return "pi pi-replay";
    case "modify":
      return "pi pi-pencil";
    case "destroy":
      return "pi pi-trash";
  }
};

// A catch clause only ever yields an untyped value, so it has to be narrowed here.
const errorMessage = (error: unknown): string =>
  error instanceof UnsafeTransactionError
    ? t(`asset_manage.unsafe_${error.code}`)
    : error instanceof Error
      ? error.message
      : String(error);

const isValidAddress = (addr: string): boolean => algosdk.isValidAddress(addr);

// --- loading -----------------------------------------------------------------------------

let loadCounter = 0;

/**
 * Loads the asset of the route. A reload after a sent transaction ("refresh") keeps the page,
 * the form and the result in place; a load for another asset starts from a clean page. An answer
 * for an asset the user already left is dropped.
 */
const loadAsset = async (refresh = false) => {
  const request = ++loadCounter;
  const id = assetId.value;
  if (!refresh) {
    busy.value = false;
    unconfirmedTxId.value = "";
    lastConfirmed.value = false;
    lastTxId.value = "";
    asset.value = undefined;
    loadError.value = "";
    signingRoute.value = undefined;
    freezeTarget.value = "";
    freezeHolding.value = undefined;
    clawbackTarget.value = "";
    clawbackReceiver.value = "";
    clawbackAmount.value = "";
    clawbackTargetHolding.value = undefined;
    clawbackReceiverHolding.value = undefined;
  }
  if (!id) {
    loading.value = false;
    return;
  }
  if (!refresh) loading.value = true;
  try {
    const found: ManagedAsset | undefined = await store.dispatch(
      "algod/getAssetForManagement",
      { assetId: id },
    );
    if (request !== loadCounter) return;
    if (!found) {
      loadError.value = t("asset_manage.not_found");
      return;
    }
    loadError.value = "";
    asset.value = found;
  } catch (error) {
    if (request !== loadCounter) return;
    console.error("Unable to load the asset", error);
    const message = t("asset_manage.load_failed", {
      error: errorMessage(error),
    });
    // A failed refresh keeps the page (and the result of the transaction) in place.
    if (refresh) await store.dispatch("toast/openError", message);
    else loadError.value = message;
  } finally {
    if (request === loadCounter) loading.value = false;
  }
};

let routeResolvedFor: string | undefined;

const resolveSigningRoute = async () => {
  const from = sender.value;
  // The route of another role address says nothing about this one; a refresh for the same
  // address keeps the form in place until the answer is known.
  if (routeResolvedFor !== from) signingRoute.value = undefined;
  routeResolvedFor = from;
  if (!from) {
    signingRoute.value = undefined;
    return;
  }
  // A role address that is no wallet account cannot be signed for by this wallet.
  if (!store.state.wallet.privateAccounts.some((a) => a.addr === from)) {
    signingRoute.value = "none";
    return;
  }
  const route = await signingRouteFor(from);
  // The page may have moved on while the signer was looked up.
  if (sender.value === from) signingRoute.value = route;
};

/**
 * A holding shown on the page: undefined = no valid address (or not loaded yet), null = the
 * node could not be asked. A failed lookup must never read as "not opted in".
 */
type LoadedHolding = AssetHolding | null | undefined;

/** The holding for a check that is about to be signed: errors are thrown, not hidden. */
const strictHolding = async (
  addr: string,
): Promise<AssetHolding | undefined> => {
  if (!assetId.value || !isValidAddress(addr)) return undefined;
  return store.dispatch("algod/getAssetHolding", {
    addr,
    assetId: assetId.value,
  });
};

/** Lookups for the displayed state in flight: "not opted in" is not said before the node answered. */
const holdingsLoading = ref(0);

const holding = async (addr: string): Promise<LoadedHolding> => {
  holdingsLoading.value++;
  try {
    return await strictHolding(addr);
  } catch (error) {
    console.error("Unable to load the holding", error);
    return null;
  } finally {
    holdingsLoading.value--;
  }
};

// One instance serves every action route: a result shown for one action does not belong to the next.
watch(action, () => {
  lastTxId.value = "";
});
watch(sender, resolveSigningRoute, { immediate: true });
// A wallet that is opened on this page, or an account that was rekeyed meanwhile, changes how
// the role address signs.
watch(
  () =>
    store.state.wallet.privateAccounts
      .map(
        (a) =>
          `${a.addr}:${a.type ?? ""}:${a.data?.[store.state.config.env]?.rekeyedTo ?? ""}`,
      )
      .join(","),
  resolveSigningRoute,
);

// --- freeze ------------------------------------------------------------------------------

const freezeTarget = ref("");
const freezeHolding = ref<LoadedHolding>();
const reloadFreezeHolding = async () => {
  const target = freezeTarget.value.trim();
  freezeHolding.value = undefined;
  const found = await holding(target);
  if (freezeTarget.value.trim() === target) freezeHolding.value = found;
};
watch(freezeTarget, reloadFreezeHolding);

const freezeProblem = (frozen: boolean) =>
  holdingsLoading.value > 0
    ? "loading"
    : freezeHolding.value === null
      ? "holding_failed"
      : checkFreeze({
          targetValid: isValidAddress(freezeTarget.value.trim()),
          holding: freezeHolding.value,
          frozen,
        });

// --- clawback ----------------------------------------------------------------------------

const clawbackTarget = ref("");
const clawbackReceiver = ref("");
const clawbackAmount = ref("");
const clawbackTargetHolding = ref<LoadedHolding>();
const clawbackReceiverHolding = ref<LoadedHolding>();

const reloadClawbackHolding = async (
  source: typeof clawbackTarget,
  into: typeof clawbackTargetHolding,
) => {
  const addr = source.value.trim();
  into.value = undefined;
  const found = await holding(addr);
  if (source.value.trim() === addr) into.value = found;
};
watch(clawbackTarget, () =>
  reloadClawbackHolding(clawbackTarget, clawbackTargetHolding),
);
watch(clawbackReceiver, () =>
  reloadClawbackHolding(clawbackReceiver, clawbackReceiverHolding),
);

const clawbackProblem = computed(() =>
  holdingsLoading.value > 0
    ? "loading"
    : clawbackTargetHolding.value === null ||
        clawbackReceiverHolding.value === null
      ? "holding_failed"
      : asset.value
        ? checkClawback({
            target: clawbackTarget.value.trim(),
            receiver: clawbackReceiver.value.trim(),
            targetValid: isValidAddress(clawbackTarget.value.trim()),
            receiverValid: isValidAddress(clawbackReceiver.value.trim()),
            targetHolding: clawbackTargetHolding.value,
            receiverHolding: clawbackReceiverHolding.value,
            amount: parseAssetAmount(
              clawbackAmount.value,
              asset.value.decimals,
            ),
          })
        : undefined,
);

const setClawbackMax = () => {
  if (asset.value && clawbackTargetHolding.value) {
    clawbackAmount.value = formatAssetAmount(
      clawbackTargetHolding.value.amount,
      asset.value.decimals,
    );
  }
};

const refreshHoldings = () =>
  Promise.all([
    reloadFreezeHolding(),
    reloadClawbackHolding(clawbackTarget, clawbackTargetHolding),
    reloadClawbackHolding(clawbackReceiver, clawbackReceiverHolding),
  ]);

// --- modify ------------------------------------------------------------------------------

const modifyRoles = reactive<AssetRoles>({
  manager: "",
  reserve: "",
  freeze: "",
  clawback: "",
});
const modifyConfirmClear = ref(false);

const configCheck = computed(() =>
  checkConfigChange(
    asset.value?.roles ?? modifyRoles,
    modifyRoles,
    isValidAddress,
  ),
);

// One confirmation covers the roles that were cleared when it was given, not roles cleared later.
watch(
  () => configCheck.value.cleared.join(","),
  () => {
    modifyConfirmClear.value = false;
  },
);

const modifyProblem = computed(() => {
  const check = configCheck.value;
  if (check.invalid.length) return "invalid_address";
  if (check.restored.length) return "role_restore";
  if (check.allCleared) return "all_cleared";
  if (!check.changed) return "no_change";
  if (check.cleared.length && !modifyConfirmClear.value) return "confirm_clear";
  return isConfigChangeAllowed(check) ? undefined : "no_change";
});

// --- destroy -----------------------------------------------------------------------------

const creatorHolding = ref<LoadedHolding>();
const destroyConfirm = ref(false);
const destroyProblem = computed(() =>
  holdingsLoading.value > 0
    ? "loading"
    : creatorHolding.value === null
      ? "holding_failed"
      : asset.value
        ? checkDestroy({
            total: asset.value.total,
            creatorHolding: creatorHolding.value,
          })
        : "creator_unknown",
);

// --- per-action reset when the asset or the action changes -------------------------------

watch(assetId, () => loadAsset(), { immediate: true });

// The address form follows the chain's addresses whenever the asset is (re)loaded, but keeps what
// the user typed when only the action tab changes.
watch(
  asset,
  (current) => {
    if (!current) return;
    Object.assign(modifyRoles, current.roles);
    modifyConfirmClear.value = false;
    if (!clawbackReceiver.value && current.roles.clawback) {
      clawbackReceiver.value = current.roles.clawback;
    }
  },
  { immediate: true },
);

watch(
  [asset, action],
  async () => {
    const current = asset.value;
    if (!current) return;
    destroyConfirm.value = false;
    creatorHolding.value = undefined;
    if (action.value === "destroy") {
      const found = await holding(current.creator);
      // The user may have moved to another asset or action while the node answered.
      if (asset.value === current && action.value === "destroy") {
        creatorHolding.value = found;
      }
    }
  },
  { immediate: true },
);

const currentProblem = computed((): string | undefined => {
  // While the node is asked nothing is reported; the buttons stay disabled meanwhile.
  if (holdingsLoading.value > 0) return undefined;
  switch (action.value) {
    case "freeze":
      // Both buttons share the problems except "no_change", which only disables one of them.
      return freezeTarget.value.trim()
        ? freezeProblem(!freezeHolding.value?.frozen)
        : undefined;
    case "clawback":
      return clawbackTarget.value.trim() ? clawbackProblem.value : undefined;
    case "modify":
      return modifyProblem.value === "no_change"
        ? undefined
        : modifyProblem.value;
    case "destroy":
      return destroyProblem.value;
    default:
      return undefined;
  }
});

// --- submission --------------------------------------------------------------------------

/**
 * Re-reads the asset from the node, checks that the role address did not change since the page
 * showed it, builds the transaction, validates it and then either signs it in place and sends
 * it or hands it to the Sign-all page (multisig, Ledger, Falcon-1024).
 */
const execute = async (
  expectDetails: () => Partial<
    Pick<
      Parameters<typeof assertAssetManagementTxnSafe>[1],
      "freeze" | "clawback" | "roles"
    >
  >,
  build: (
    from: string,
    fresh: ManagedAsset,
    suggestedParams: algosdk.SuggestedParams,
  ) => Promise<algosdk.Transaction>,
) => {
  const id = assetId.value;
  const act = action.value;
  if (!id || !act || locked.value) return;
  busy.value = true;
  lastTxId.value = "";
  try {
    const fresh: ManagedAsset | undefined = await store.dispatch(
      "algod/getAssetForManagement",
      { assetId: id },
    );
    if (!fresh) throw new Error(t("asset_manage.not_found"));
    const from = actionSender(fresh, act);
    if (!from || from !== sender.value) {
      asset.value = fresh;
      throw new Error(t("asset_manage.role_changed"));
    }
    const inWallet = store.state.wallet.privateAccounts.some(
      (a) => a.addr === from,
    );
    const route = inWallet ? await signingRouteFor(from) : "none";
    if (route === "none") {
      throw new Error(t("asset_manage.no_signer", { role: roleLabel.value }));
    }
    const suggestedParams: algosdk.SuggestedParams = await store.dispatch(
      "algod/getCheckedTransactionParams",
    );
    const txn = await build(from, fresh, suggestedParams);
    assertAssetManagementTxnSafe(txn, {
      sender: from,
      assetId: id,
      action: act,
      ...expectDetails(),
    });

    if (route === "signAll") {
      await handOffToSignAll([txn], "AssetManagement");
      return;
    }
    const txId: string | undefined = await store.dispatch("algod/signAndSend", {
      txn,
      payFrom: from,
      reportSendErrors: true,
    });
    // A cancelled or refused signature was already reported by the signer.
    if (!txId) return;
    // The user may have opened another asset or action while the transaction was signed and sent.
    const stillHere = () => assetId.value === id && action.value === act;
    if (stillHere()) {
      lastTxId.value = txId;
      lastConfirmed.value = false;
    }
    let confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId,
      timeout: 4,
    });
    // Not confirmed yet: wait a little longer before the form is offered again, so the same
    // action is not sent twice while the first one may still confirm.
    if (!confirmation && stillHere()) {
      confirmation = await store.dispatch("algod/waitForConfirmation", {
        txId,
        timeout: 10,
      });
    }
    if (!stillHere()) {
      // Not this page's business any more: a toast is the only place the result can go.
      // An unconfirmed send may still confirm, so it is never reported as an error.
      await store.dispatch(
        "toast/openSuccess",
        confirmation
          ? t("asset_manage.confirmed", { txId })
          : t("asset_manage.sent", { txId }),
      );
      return;
    }
    lastConfirmed.value = !!confirmation;
    // Not confirmed (timeout, or rejected after submission): nothing can have changed yet, so the
    // page neither re-reads the state nor leaves; the result says only that it was sent.
    if (!confirmation) {
      unconfirmedTxId.value = txId;
      return;
    }
    if (act === "destroy") {
      // The page is left, so the result is told by a toast.
      await store.dispatch(
        "toast/openSuccess",
        t("asset_manage.confirmed", { txId }),
      );
      // The indexer lags the node: the hub is told which asset is gone.
      await router.push({
        path: "/asset",
        query: { destroyed: id.toString() },
      });
      return;
    }
    await loadAsset(true);
    await resolveSigningRoute();
    // The holder's frozen state and balances changed with the transaction.
    await refreshHoldings();
  } catch (error) {
    console.error("Asset management failed", error);
    await store.dispatch("toast/openError", errorMessage(error));
  } finally {
    busy.value = false;
  }
};

/**
 * After an unconfirmed send: asks the node once more. When the transaction confirmed, the page
 * shows the new state; otherwise the user is given the current state of the chain back, and the
 * strict re-reads before signing prevent a repeated action from using a stale balance.
 */
const checkAgain = async () => {
  const txId = unconfirmedTxId.value;
  if (!txId || busy.value) return;
  busy.value = true;
  try {
    const confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId,
      timeout: 4,
    });
    unconfirmedTxId.value = "";
    lastConfirmed.value = !!confirmation;
    await loadAsset(true);
    await refreshHoldings();
  } finally {
    busy.value = false;
  }
};

/** Throws when the problem check, repeated with the node's current answer, fails. */
const ensure = (problem: string | undefined) => {
  if (problem) throw new Error(t(`asset_manage.problem_${problem}`));
};

const submitFreeze = (frozen: boolean) => {
  const target = freezeTarget.value.trim();
  return execute(
    () => ({ freeze: { target, frozen } }),
    async (from, fresh, suggestedParams) => {
      const current = await strictHolding(target);
      freezeHolding.value = current;
      ensure(
        checkFreeze({
          targetValid: isValidAddress(target),
          holding: current,
          frozen,
        }),
      );
      return buildAssetFreezeTxn({
        sender: from,
        assetId: fresh.assetId,
        target,
        frozen,
        suggestedParams,
      });
    },
  );
};

const submitClawback = () => {
  const target = clawbackTarget.value.trim();
  const receiver = clawbackReceiver.value.trim();
  let requested = 0n;
  return execute(
    () => ({ clawback: { target, receiver, amount: requested } }),
    async (from, fresh, suggestedParams) => {
      const amount = parseAssetAmount(clawbackAmount.value, fresh.decimals);
      const [targetHolding, receiverHolding] = await Promise.all([
        strictHolding(target),
        strictHolding(receiver),
      ]);
      clawbackTargetHolding.value = targetHolding;
      clawbackReceiverHolding.value = receiverHolding;
      ensure(
        checkClawback({
          target,
          receiver,
          targetValid: isValidAddress(target),
          receiverValid: isValidAddress(receiver),
          targetHolding,
          receiverHolding,
          amount,
        }),
      );
      requested = amount as bigint;
      return buildAssetClawbackTxn({
        sender: from,
        assetId: fresh.assetId,
        target,
        receiver,
        amount: amount as bigint,
        suggestedParams,
      });
    },
  );
};

const submitModify = () => {
  const next: AssetRoles = {
    manager: modifyRoles.manager.trim(),
    reserve: modifyRoles.reserve.trim(),
    freeze: modifyRoles.freeze.trim(),
    clawback: modifyRoles.clawback.trim(),
  };
  return execute(
    () => ({ roles: next }),
    async (from, fresh, suggestedParams) => {
      // The form started from the addresses shown when the page loaded. A role that changed on
      // the chain since then would be sent back with its old address, so start over instead.
      const loaded = asset.value?.roles;
      if (
        !loaded ||
        ASSET_ROLES.some((role) => loaded[role] !== fresh.roles[role])
      ) {
        asset.value = fresh;
        throw new Error(t("asset_manage.role_changed"));
      }
      // Compared with the node's current addresses.
      const check = checkConfigChange(fresh.roles, next, isValidAddress);
      if (!isConfigChangeAllowed(check)) {
        ensure(
          check.invalid.length
            ? "invalid_address"
            : check.restored.length
              ? "role_restore"
              : check.allCleared
                ? "all_cleared"
                : "no_change",
        );
      }
      if (check.cleared.length && !modifyConfirmClear.value)
        ensure("confirm_clear");
      return buildAssetConfigTxn({
        sender: from,
        assetId: fresh.assetId,
        roles: next,
        suggestedParams,
      });
    },
  );
};

const submitDestroy = () =>
  execute(
    () => ({}),
    async (from, fresh, suggestedParams) => {
      const current = await strictHolding(fresh.creator);
      creatorHolding.value = current;
      ensure(checkDestroy({ total: fresh.total, creatorHolding: current }));
      if (!destroyConfirm.value) ensure("confirm_destroy");
      return buildAssetDestroyTxn({
        sender: from,
        assetId: fresh.assetId,
        suggestedParams,
      });
    },
  );
</script>

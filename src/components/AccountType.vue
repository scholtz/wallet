<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps({
  account: null,
  accountData: null,
});
</script>
<template>
  <Badge
    v-if="props.accountData?.rekeyedTo"
    severity="danger"
    :value="t('acc_type.rekeyed')"
  />
  <Badge
    v-else-if="props.account?.sk"
    severity="info"
    :value="t('acc_type.basic_account')"
  />
  <Badge
    v-else-if="props.account?.type == '2fa'"
    severity="info"
    value="2FA Multisig"
  />
  <Badge
    v-else-if="props.account?.type == '2faApi'"
    value="2FA API technical account"
  />
  <Badge
    severity="warning"
    v-else-if="props.account?.params"
    :value="t('acc_type.multisig_account')"
  />
  <Badge
    severity="success"
    v-else-if="props.account?.type == 'ledger'"
    :value="t('acc_type.ledger_account')"
  />
  <Badge
    severity="success"
    v-else-if="props.account?.type == 'wc'"
    :value="t('acc_type.wc_account')"
  />
  <Badge v-else severity="info" :value="t('acc_type.public_account')" />
</template>

<script setup lang="ts">
import MainLayout from "../layouts/Main.vue";
</script>

<template>
  <MainLayout>
    <h1>{{ $t("newacc.title") }}</h1>

    <div class="field grid">
      <RouterLink
        to="/new-account/ed25529"
        class="col-12 mb-2 md:col-2 md:mb-0"
      >
        <Button class="w-full">
          {{ $t("newacc.create_basic") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.create_basic_help") }}
      </div>
    </div>

    <div class="field grid">
      <RouterLink to="/new-account/ledger" class="col-12 mb-2 md:col-2 md:mb-0">
        <Button class="w-full">
          {{ $t("newacc.ledger_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.ledger_account_help") }}
      </div>
    </div>

    <div class="field grid">
      <RouterLink to="/new-account/wc" class="col-12 mb-2 md:col-2 md:mb-0">
        <Button class="w-full">
          {{ $t("newacc.wc_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.wc_account_help") }}
      </div>
    </div>
    <div class="field grid">
      <RouterLink to="/new-account/2fa" class="col-12 mb-2 md:col-2 md:mb-0">
        <Button class="w-full">
          {{ $t("newacc.twofa_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.twofa_account_help") }}
      </div>
    </div>
    <div class="field grid">
      <RouterLink
        to="/new-account/email-password"
        class="col-12 mb-2 md:col-2 md:mb-0"
      >
        <Button class="w-full">
          {{ $t("newacc.email_pass_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.email_pass_account_help") }}
      </div>
    </div>
    <div class="field grid">
      <RouterLink to="/new-account/vanity" class="col-12 mb-2 md:col-2 md:mb-0">
        <Button class="w-full">
          {{ $t("newacc.create_vanity") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.create_vanity_help") }}
      </div>
    </div>
    <div class="field grid">
      <RouterLink
        to="/new-account/multisig"
        class="col-12 mb-2 md:col-2 md:mb-0"
      >
        <Button class="w-full">
          {{ $t("newacc.create_multisign_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.create_multisign_account_help") }}
      </div>
    </div>
    <div class="field grid">
      <RouterLink to="/new-account/watch" class="col-12 mb-2 md:col-2 md:mb-0">
        <Button class="w-full">
          {{ $t("newacc.watch_account") }}
        </Button>
      </RouterLink>
      <div class="col-12 md:col-10">
        {{ $t("newacc.watch_account_help") }}
      </div>
    </div>
  </MainLayout>
</template>

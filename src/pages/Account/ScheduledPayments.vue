<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { useStore } from "vuex";
import { onMounted, reactive } from "vue";
import { FilterMatchMode } from "primevue/api";
const store = useStore();

onMounted(async () => {
  await store.dispatch("wallet/prolong");
});

const state = reactive({
  selection: "",
  apps: [
    {
      appId: 123,
      balanceFee: 123,
    },
  ],
  filters: {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  },
});
</script>
<template>
  <MainLayout>
    <h1>Scheduled payments management</h1>
    <Card>
      <template #content>
        <DataTable
          v-model:selection="state.selection"
          :value="state.apps"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
          v-model:filters="state.filters"
          filterDisplay="menu"
          :globalFilterFields="['appId']"
        >
          <template #header>
            <div class="grid" v-if="state.filters['global']">
              <div class="col">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="state.filters['global'].value"
                    placeholder="Keyword Search"
                  />
                </span>
              </div>
            </div>
          </template>
          <template #empty> No scheduled payments has been found </template>
          <Column
            field="appId"
            :header="$t('scheduled_payments.app_id')"
            :sortable="true"
          />
          <Column
            field="feeBalance"
            :header="$t('scheduled_payments.fee_balance')"
            :sortable="true"
          />
        </DataTable>
      </template>
    </Card>
  </MainLayout>
</template>

<template>
  <MainLayout>
    <h1>Account overview</h1>
    <p>{{ $route.params.account }}</p>
    <h2>Transactions</h2>

    <DataTable
      :value="transactions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
    >
      <template #empty> No records found </template>
      <Column field="name" header="Account name"></Column>
      <Column field="addr" header="Address"></Column>
      <Column field="amount" header="Amount">
        <template #body="slotProps">
          <div class="text-end">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template>
      </Column>
      <Column field="reward-base" header="reward-base"></Column>

      <Column>
        <template #body="slotProps">
          <router-link
            :to="'/accounts/pay/' + slotProps.data.addr"
            class="btn btn-light btn-xs"
            >Pay</router-link
          >
        </template>
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
export default {
  components: {
    MainLayout,
  },
  data() {
    return {
      transactions: [],
    };
  },
};
</script>
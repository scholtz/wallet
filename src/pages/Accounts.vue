<template>
  <main-layout>
    <h1>Accounts overview</h1>
    <v-grid
      theme="compact"
      :autoSize="true"
      :resize="true"
      :autoSizeColumn="{
        mode: 'autoSizeAll',
      }"
      :source="$store.state.wallet.privateAccounts"
      :columns="columns"
    />
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import VGrid from "@revolist/vue3-datagrid";
export default {
  name: "App",
  data() {
    return {
      columns: [
        {
          prop: "addr",
          name: "Address",
          sortable: true,
          order: "asc",
          size: 600,
          filter: true,
        },
        {
          name: "X",
          sortable: false,
          filter: false,
          cellTemplate: () => {
            return "x";
          },
        },
      ],
    };
  },
  components: {
    VGrid,
    MainLayout,
  },
};
</script>
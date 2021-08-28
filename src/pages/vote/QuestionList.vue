<template>
<div>
    <DataTable v-if="!selection"
      :value="questions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> {{ $t("acc_overview.no_questions") }} </template>
      <Column
        field="note.t"
        :header="$t('votequestion.title')"
        :sortable="true"
      ></Column>
      <Column
        field="round"
        :header="$t('votequestion.round')"
        :sortable="true"
      ></Column>
      <Column
        field="note.max"
        :header="$t('votequestion.maxround')"
        :sortable="true"
      ></Column>
      <Column
        field="round-time"
        :header="$t('acc_overview.time')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div v-if="slotProps.column.props.field in slotProps.data">
            {{
              $filters.formatDateTime(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template>
      </Column>
      <Column
        field="note.category"
        :header="$t('votequestion.category')"
        :sortable="true"
      ></Column>
      <Column
        field="sender"
        :header="$t('acc_overview.sender')"
        :sortable="true"
        styleClass="not-show-at-start"
      ></Column>
    </DataTable>
    <div v-if="selection">
        <button class="btn btn-xs btn-primary" @click="this.selection = null">List all questions</button>
        <table>
            <tr><th>Round:</th><td>{{this.selection.round}}</td></tr>
            <tr><th>round-time:</th><td>{{this.selection["round-time"]}}</td></tr>
            <tr><th>sender:</th><td>{{this.selection["sender"]}}</td></tr>
            <tr><th>id:</th><td>{{this.selection["id"]}}</td></tr>
            <tr><th>Title:</th><td>{{this.selection.note.t}}</td></tr>
            <tr><th>Question:</th><td>{{this.selection.note.q}}</td></tr>
            <tr><th>Category:</th><td>{{this.selection.note["category"]}}</td></tr>
            <tr><th>Url:</th><td>{{this.selection.note["url"]}}</td></tr>
            <tr><th>Options:</th><td>
                <div v-for="(o,index) in this.selection.note.o" :key="index">
                    {{o}}
                    </div>
                </td></tr>
        </table>

    </div>
    </div>
</template>

<script>
import { mapActions } from "vuex";
export default {
  data() {
    return {
        selection:null,
        questions:[],
    };
  },
  async mounted() {
     const txs = await  this.searchForTransactionsWithNoteAndAmount("avote-question/v1:",702);
     if(txs.transactions){
     for(let index in txs.transactions){
         const tx = txs.transactions[index]
         if(!tx["sender"]) continue;
         let note = "";
        if(this.isBase64(tx.note)){
        note = atob(tx.note)
        }
        if(!note.startsWith("avote-question/v1:j")){
            continue;
        }
        note = note.replace("avote-question/v1:j","")
        const noteJson = JSON.parse(note);
console.log("noteJson",noteJson)

     this.questions.push({
         round: tx["confirmed-round"],
         "round-time": tx["round-time"],
         sender: tx["sender"],
         id: tx["id"],
         note:noteJson,
     })
     }
     }else{
         console.log("no transactions found")
     }
    console.log("txs", txs,this.questions);
  },
  methods: {
    ...mapActions({
      searchForTransactionsWithNoteAndAmount:
        "indexer/searchForTransactionsWithNoteAndAmount",
      openSuccess: "toast/openSuccess",
    }),
    
    isBase64(str) {
      if (!str) return false;
      if (str.trim() === "") {
        return false;
      }
      try {
        return btoa(atob(str)) == str;
      } catch (err) {
        return false;
      }
    },
    async createAsset(e) {
      e.preventDefault();
      console.log("asset", this.asset);
      const asset = await this.makeAssetCreateTxnWithSuggestedParams({
        asset: this.asset,
      });
      if (asset.txId) {
        this.openSuccess("Asset request sent to the network: " + asset.txId);
      }
    },
  },
};
</script>
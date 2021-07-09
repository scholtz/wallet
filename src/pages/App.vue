<template>
  <MainLayout>
    <div class="container-fluid">
      <h1>App</h1>
      <div class="form-group">
        <label for="appId" class="m-2">AppId</label>
        <input
          id="appId"
          type="number"
          min="1"
          max="99999999"
          step="1"
          class="form-control m-2"
          v-model="appId"
        />
      </div>
      {{ ctx }}
      <select v-model="app" class="form-control m-2">
        <option value="Info">Info</option>
        <option value="Nft-Auction">Nft-Auction</option>
      </select>

      <div v-if="app == 'Info'">
        <label for="info" class="m-2">Info</label>
        <input id="info" class="form-control m-2" v-model="info" />
        <label for="request" class="m-2">request</label>
        <input
          id="request"
          type="number"
          min="1"
          max="99999999"
          step="1"
          class="form-control m-2"
          v-model="request"
        />
        <button class="btn btn-primary m-2" @click="clickA">Alice</button>
        <button class="btn btn-primary m-2" @click="clickB">Bob</button>
      </div>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { loadStdlib } from "@reach-sh/stdlib";
import algosdk from "algosdk";

import * as Backend from "../shared/build/Nft-Auction.main.mjs";
import * as BackendInfo from "../shared/build/Info.main.mjs";
import { mapActions } from "vuex";

export default {
  data() {
    return {
      app: "Info",
      getId: 23,
      deadline: 22500,
      nftViewAddress: "1",
      reach: null,
      ctx: null,
      appId: null,
      reachSetup: false,
      info: "",
      request: 1,
    };
  },
  watch: {
    appId() {
      if (this.appId) {
        this.setup();
      }
    },
  },
  components: {
    MainLayout,
  },
  async mounted() {},
  methods: {
    ...mapActions({
      getSK: "wallet/getSK",
    }),
    async isAuctionOn(getId, nftViewAddress) {
      console.log("isAuctionOn", getId, nftViewAddress);
      return true;
    },
    async informTimeout() {
      console.log("informTimeout");
    },
    async seeOutcome(deneme, Address) {
      console.log("seeOutcome", deneme, Address);
    },
    async showBid(deneme, UInt, Address) {
      console.log("showBid", deneme, UInt, Address);
    },
    async setup() {
      try {
        if (this.reach == null) {
          const url = new URL(this.$store.state.config.algod);
          const algodClient = new algosdk.Algodv2(
            this.$store.state.config.algodToken,
            this.$store.state.config.algod,
            url.port
          );

          const indexerurl = new URL(this.$store.state.config.indexer);
          const indexerClient = new algosdk.Indexer(
            this.$store.state.config.indexerToken,
            this.$store.state.config.indexer,
            indexerurl.port
          );
          if (this.appId) {
            const app = await indexerClient.lookupApplications(this.appId).do();
            if (app && app.application && app.application["created-at-round"]) {
              this.ctx = {
                ApplicationID: app.application.id,
                Deployer: app.application.params.creator,
                creationRound: app.application["created-at-round"],
              };
            }
            console.log("app", app, this.ctx);
          }
          console.log("setting up reach ", url, indexerurl);
          if (!this.reachSetup) {
            this.reach = loadStdlib("ALGO");
            this.reach.setProvider({ algodClient, indexer: indexerClient });
            this.reachSetup = true;
          }
        }
      } catch (e) {
        console.log("e", e);
      }
    },
    async want(UInt) {
      console.log("want", UInt);
    },
    async got(str) {
      console.log("got", str);
    },
    async clickA() {
      try {
        const sk = await this.getSK({ addr: this.$route.params.account });
        if (sk) {
          this.setup();
          const mn = algosdk.secretKeyToMnemonic(sk);
          const acc = await this.reach.newAccountFromMnemonic(mn);
          acc.setDebugLabel("ACC1");
          const balAtomic = await this.reach.balanceOf(acc);
          console.log("balAtomic", balAtomic);
          let ctc = null;
          if (this.ctx && this.ctx.ApplicationID) {
            ctc = await acc.attach(BackendInfo, this.ctx);
          } else {
            ctc = await acc.deploy(BackendInfo);
          }
          console.log("ctc", ctc);
          const getInfo = await ctc.getInfo();
          this.ctx = getInfo;
          console.log("getInfo", getInfo);
          console.log("params", this.info, this.request);
          const Alice = await BackendInfo.Alice(ctc, this);
          console.log("Alice", Alice);
        }
      } catch (e) {
        console.log("error", e);
      }
    },
    async clickB() {
      try {
        const sk = await this.getSK({ addr: this.$route.params.account });
        if (sk) {
          this.setup();
          const mn = algosdk.secretKeyToMnemonic(sk);
          const acc = await this.reach.newAccountFromMnemonic(mn);
          acc.setDebugLabel("ACC1");
          const balAtomic = await this.reach.balanceOf(acc);
          console.log("balAtomic", balAtomic);
          let ctc = null;
          if (this.ctx && this.ctx.ApplicationID) {
            ctc = await acc.attach(BackendInfo, this.ctx);
          } else {
            ctc = await acc.deploy(BackendInfo);
          }
          console.log("ctc", ctc);

          const Bob = await BackendInfo.Bob(ctc, this);
          console.log("Bob", Bob);
        }
      } catch (e) {
        console.log("error", e);
      }
    },
    async clickCreator() {
      try {
        const sk = await this.getSK({ addr: this.$route.params.account });
        if (sk) {
          this.setup();
          console.log("this.$route.params.account", this.$route.params.account);
          console.log("sk", sk);
          const mn = algosdk.secretKeyToMnemonic(sk);
          console.log("mn", mn);
          const acc = await this.reach.newAccountFromMnemonic(mn);
          const debug = acc.setDebugLabel("ACC1");

          console.log("acc,mn", acc, mn, debug);
          const balAtomic = await this.reach.balanceOf(acc);
          console.log("getNetworkTime", await this.reach.getNetworkTime());

          console.log("balAtomic", balAtomic);
          console.log("Backend", Backend.Bidder);
          //const deploy = acc.deploy(Backend);
          //console.log("deploy", deploy);
          /*
      const ctx = {
        ApplicationID: 15,
        creationRound: 19980,
        Deployer: "K7PPBDZEC6IJMWN2BAIIBNUPLK5BM6G6MVQR3UQUZ5G72VI2F5SAA6NCTE",
      };*/
          const ctx = {
            ApplicationID: 47,
            Deployer:
              "K7PPBDZEC6IJMWN2BAIIBNUPLK5BM6G6MVQR3UQUZ5G72VI2F5SAA6NCTE",
            creationRound: 23250,
          };
          const ctc = await acc.attach(Backend, ctx);
          /* */
          //const ctc = await acc.deploy(Backend);

          console.log("ctc", ctc);
          const getInfo = await ctc.getInfo();
          console.log("getInfo", getInfo);
          console.log("getViews", ctc.getViews());
          const views = await ctc.getViews();
          const owner = await views.NFT.owner();
          console.log("getViews", views, owner);
          console.log("params", this.getId, this.deadline, this.nftViewAddress);
          const creator = await Backend.Creator(ctc, this);
          console.log("creator", creator);
        }
      } catch (e) {
        console.log("error", e);
      }
    },
  },
};
</script>

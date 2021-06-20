<template>
  <main-layout>
    <div class="container-fluid">
      <h1>{{ $t("newacc.title") }}</h1>
      <div v-if="page == 'new'">
        <button v-if="!w" class="btn btn-primary m-1" @click="createAccount">
          {{ $t("newacc.create_basic") }}</button
        ><button v-if="!w" class="btn btn-primary m-1" @click="createVanity">
          {{ $t("newacc.create_vanity") }}
        </button>
        <button
          v-if="!w"
          class="btn btn-primary m-1"
          @click="page = 'importaccount'"
        >
          {{ $t("newacc.import_account") }}
        </button>
        <button
          v-if="!w"
          class="btn btn-primary m-1"
          @click="page = 'multisigaccount'"
        >
          {{ $t("newacc.create_multisign_account") }}
        </button>
        <button
          v-if="!w"
          class="btn btn-primary m-1"
          @click="page = 'watchaccount'"
        >
          {{ $t("newacc.watch_account") }}
        </button>
      </div>
      <div v-if="page == 'importaccount'">
        <div class="row">
          <div :class="scanMnemonic ? 'col-8' : 'col-12'">
            <p>{{ $t("newacc.write_mnemonic") }}</p>
            <textarea class="form-control my-1" v-model="w" />

            <p>{{ $t("newacc.name") }}</p>
            <input v-model="name" class="form-control" />

            <button class="btn btn-primary m-1" @click="importAccountClick">
              {{ $t("newacc.create_account") }}
            </button>

            <button
              v-if="!scanMnemonic"
              class="btn btn-light m-1"
              @click="scanMnemonic = true"
            >
              {{ $t("newacc.scan") }}
            </button>
            <button
              v-if="scanMnemonic"
              class="btn btn-light m-1"
              @click="scanMnemonic = false"
            >
              {{ $t("global.stop_camera") }}
            </button>
            <button class="btn btn-light m-1" @click="reset">
              {{ $t("global.go_back") }}
            </button>
          </div>
          <div v-if="scanMnemonic" class="col-4">
            <QrcodeStream @decode="onDecodeQRMnemonic" />
          </div>
        </div>
      </div>
      <div v-if="page == 'vanity'">
        <p>{{ $t("newacc.vanity_start") }}</p>
        <input v-model="vanityStart" class="form-control my-2" />
        <p>{{ $t("newacc.vanity_mid") }}</p>
        <input v-model="vanityMid" class="form-control my-2" />
        <p>{{ $t("newacc.vanity_end") }}</p>
        <input v-model="vanityEnd" class="form-control my-2" />
        <p>{{ $t("newacc.vanity_workers") }}</p>
        <input
          v-model="vanityWorkers"
          class="form-control my-2"
          type="number"
          min="1"
          max="100"
          step="1"
        />
        <div v-if="vanityCount">
          {{ $t("newacc.vanity_count") }} {{ vanityCount }} {{ vanityTime }} ({{
            vanityRPS
          }}/s)
        </div>
        <div class="alert alert-success my-2" v-if="a">{{ a }}</div>
        <button
          v-if="!vanityRunning"
          class="btn my-1"
          :class="a ? 'btn-light' : 'btn-primary'"
          @click="createVanityStartClick"
        >
          {{ $t("newacc.vanity_button_start") }}
        </button>
        <button
          v-if="vanityRunning"
          class="btn btn-primary my-1"
          @click="createVanityStopClick"
        >
          {{ $t("newacc.vanity_button_stop") }}
        </button>
        <button
          v-if="!vanityRunning && a"
          class="btn btn-primary my-1"
          @click="useVanityStartClick"
        >
          {{ $t("newacc.vanity_use") }}
        </button>
        <button class="btn btn-light m-1" @click="reset">
          {{ $t("global.go_back") }}
        </button>
        <div v-if="vanityRunning" class="alert alert-danger">
          {{ $t("newacc.auto_lock_off") }}
        </div>
      </div>
      <div v-if="page == 'watchaccount'">
        <p>{{ $t("newacc.name") }}</p>
        <input v-model="name" class="form-control my-2" />
        <p>{{ $t("newacc.address") }}</p>
        <input v-model="addr" class="form-control my-2" />

        <button class="btn btn-primary my-1" @click="watchAccountClick">
          {{ $t("newacc.watch_account") }}
        </button>
        <button class="btn btn-light m-1" @click="reset">
          {{ $t("global.go_back") }}
        </button>
      </div>
      <div v-if="page == 'multisigaccount'">
        <p>
          {{ $t("newacc.multisig_help") }}
        </p>
        <p>{{ $t("newacc.select_account_from_list") }}:</p>
        <select
          class="select form-control"
          multiple
          rows="20"
          v-model="multisigaccts"
          style="min-height: 150px"
        >
          <option
            v-for="option in $store.state.wallet.privateAccounts"
            :key="option.addr"
            :value="option.addr"
          >
            {{ option.name }} - {{ option.addr }}
          </option>
        </select>
        <p class="my-2">{{ $t("newacc.add_other_accounts") }}:</p>
        <textarea
          class="form-control my-1"
          v-model="friendaccounts"
          style="min-height: 150px"
        />

        <p class="my-2">
          {{ $t("newacc.trashold_help") }} ({{ multisignum }}/{{
            countAccounts()
          }}):
        </p>
        <input
          type="range"
          class="form-range"
          min="1"
          :max="countAccounts()"
          v-model="multisignum"
          id="customRange2"
        />

        <input
          type="number"
          class="form-control"
          min="1"
          :max="countAccounts()"
          v-model="multisignum"
          id="customRange2"
        />

        <p>{{ $t("newacc.name") }}</p>
        <input v-model="name" class="form-control" />

        <button class="btn btn-primary m-1" @click="createMultisignClick">
          {{ $t("newacc.create_account") }}
        </button>
        <button class="btn btn-light m-1" @click="reset">
          {{ $t("global.go_back") }}
        </button>
      </div>
      <div v-if="!this.s && page == 'newaccount'">
        <p>
          {{ $t("newacc.create_account_help") }}
        </p>
        <button v-if="!this.s" class="btn btn-primary" @click="this.s = true">
          {{ $t("newacc.show_mnemonic") }}
        </button>
      </div>
      <div v-if="this.s && this.challenge">
        <p>{{ $t("newacc.position_question") }} {{ r }}?</p>
        <input class="form-control" v-model="guess" />
        <p>{{ $t("newacc.name") }}</p>
        <input v-model="name" class="form-control" />
        <button
          v-if="this.s"
          class="btn btn-primary m-1"
          @click="confirmCreate"
        >
          {{ $t("newacc.create_account") }}
        </button>
        <button
          v-if="this.s"
          class="btn btn-primary m-1"
          @click="
            this.challenge = false;
            this.s = false;
          "
        >
          {{ $t("global.go_back") }}
        </button>
      </div>
      <div v-if="this.s && !this.challenge && page == 'newaccount'">
        <p>
          {{ $t("newacc.mnemonic_help") }}
        </p>

        <textarea class="form-control my-1" v-model="w" />
        <input class="form-control my-1" v-model="a" />

        <QRCodeVue3
          :width="500"
          :height="500"
          :value="w"
          :cornersSquareOptions="{ type: 'square', color: '#333' }"
          :cornersDotOptions="{
            type: 'square',
            color: '#333',
            gradient: {
              type: 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: '#333' },
                { offset: 1, color: '#000' },
              ],
            },
          }"
          :dotsOptions="{
            type: 'square',
            color: '#333',
            gradient: {
              type: 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: '#333' },
                { offset: 1, color: '#000' },
              ],
            },
          }"
        />

        <button v-if="this.s" class="btn btn-primary m-1" @click="makeRandom">
          {{ $t("newacc.start_challenge") }}
        </button>
        <button v-if="this.s" class="btn btn-light m-1" @click="createAccount">
          {{ $t("newacc.create_new") }}
        </button>
        <button v-if="this.s" class="btn btn-light m-1" @click="this.s = false">
          {{ $t("newacc.hide_mnemonic") }}
        </button>
        <button v-if="this.s" class="btn btn-light m-1" @click="reset">
          {{ $t("newacc.drop_phrase") }}
        </button>
      </div>
    </div>
  </main-layout>
</template>
<script>
import MainLayout from "../layouts/Main.vue";
import algosdk from "algosdk";
import { mapActions } from "vuex";
import QRCodeVue3 from "qrcode-vue3";
import { QrcodeStream } from "qrcode-reader-vue3";
import moment from "moment";
//import { sendMessage } from "../workers/vanity-api";
import Worker from "worker-loader!../workers/vanity";

export default {
  data() {
    return {
      r: 0,
      a: "",
      w: "",
      guess: "",
      s: false,
      challenge: false,
      scanMnemonic: false,
      page: "new",
      multisignum: 2,
      multisigaccts: [],
      friendaccounts: "",
      name: "",
      addr: "",
      vanityStart: "",
      vanityMid: "",
      vanityEnd: "",
      vanityRunning: false,
      vanityCount: 0,
      vanityThreads: [],
      vanityWorkers: 8,
      vanityStarted: null,
      vanityTime: "",
      vanityRPS: "", // results per second
    };
  },
  components: {
    MainLayout,
    QRCodeVue3,
    QrcodeStream,
  },
  mounted() {
    this.reset();
  },
  methods: {
    ...mapActions({
      addPrivateAccount: "wallet/addPrivateAccount",
      addMultiAccount: "wallet/addMultiAccount",
      addPublicAccount: "wallet/addPublicAccount",
      prolong: "wallet/prolong",
    }),
    reset() {
      this.name = "";
      this.page = "new";
      this.s = false;
      this.w = "";
      this.addr = "";
      this.vanityRunning = false;
      this.vanityCount = 0;
      this.vanityStarted = null;
      this.prolong();
    },
    createAccount() {
      console.log("this", this);
      this.page = "newaccount";
      let account = algosdk.generateAccount();
      this.a = account.addr;
      this.w = algosdk.secretKeyToMnemonic(account.sk);
    },
    createVanity() {
      console.log("this", this);
      this.page = "vanity";
      this.a = "";
    },
    useVanityStartClick(e) {
      e.preventDefault();

      this.page = "newaccount";
    },
    async createVanityStartClick() {
      this.vanityCount = 0;
      this.vanityRunning = true;
      this.vanityStarted = moment();
      for (let index in this.vanityThreads) {
        this.vanityThreads[index].terminate();
      }
      this.vanityThreads = [];
      for (let i = 0; i < this.vanityWorkers; i++) {
        const worker = new Worker();

        worker.addEventListener("message", (e) => {
          const account = e.data;
          if (e.data && e.data.addr) {
            this.vanityRunning = false;
            this.a = account.addr;
            this.w = algosdk.secretKeyToMnemonic(account.sk);
          } else {
            this.vanityCount += e.data;
          }

          if (this.vanityRunning) {
            worker.postMessage({
              vanityStart: this.vanityStart,
              vanityMid: this.vanityMid,
              vanityEnd: this.vanityEnd,
            });
            this.prolong();
          } else {
            for (let index in this.vanityThreads) {
              this.vanityThreads[index].terminate();
            }
          }
          const duration = moment.duration(moment().diff(this.vanityStarted));
          const miliseconds = duration.valueOf();
          this.vanityTime = moment.utc(miliseconds).format("HH:mm:ss");

          this.vanityRPS =
            Math.round((this.vanityCount / miliseconds) * 1000000) / 1000;
          //.subtract(moment(this.vanityStarted))
        });
        worker.postMessage({
          vanityStart: this.vanityStart,
          vanityMid: this.vanityMid,
          vanityEnd: this.vanityEnd,
        });
      }
    },
    async createVanityStopClick() {
      this.vanityRunning = false;

      for (let index in this.vanityThreads) {
        this.vanityThreads[index].terminate();
      }
    },
    makeRandom() {
      this.guess = "";
      this.challenge = true;
      //this.r = Math.floor(Math.random() * 25) + 1;
      this.r = 1;
    },
    confirmCreate() {
      const that = this;
      const words = this.w.split(" ");
      if (words[this.r - 1] == this.guess.trim()) {
        this.addPrivateAccount({ mn: this.w, name: this.name }).then((r) => {
          if (r) {
            that.$router.push({ name: "Accounts" });
          }
        });
      } else {
        console.log("error");
      }
    },
    createMultisignClick() {
      const accounts = this.friendaccounts.split("\n");
      let accts = Array.from(this.multisigaccts);

      for (let index in accounts) {
        if (accounts[index].length == 58) {
          accts.push(accounts[index]);
        }
      }
      const mparams = {
        version: 1,
        threshold: this.multisignum,
        addrs: accts,
      };
      console.log("mparams", mparams, this.multisigaccts, accts);
      this.addMultiAccount({ params: mparams, name: this.name });
    },
    importAccountClick() {
      const that = this;
      this.addPrivateAccount({ mn: this.w, name: this.name }).then((r) => {
        if (r) {
          that.$router.push({ name: "Accounts" });
        }
      });
    },
    watchAccountClick() {
      const that = this;
      this.addPublicAccount({ name: this.name, addr: this.addr }).then((r) => {
        if (r) {
          that.$router.push({ name: "Accounts" });
        }
      });
    },

    countAccounts() {
      const accounts = this.friendaccounts.split("\n");
      let ret = this.multisigaccts.length;
      for (let index in accounts) {
        if (accounts[index].length == 58) {
          ret++;
        }
      }
      return ret;
    },
    onDecodeQRMnemonic(result) {
      if (result) {
        this.w = result;
      }
    },
  },
};
</script>

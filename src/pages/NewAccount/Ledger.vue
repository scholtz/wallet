<template>
  <MainLayout>
    <h1>{{ $t("new_account_ledger.header") }}</h1>
    <p>
      {{ $t("new_account_ledger.description") }}
    </p>
    <div v-if="lastError">
      <div class="alert alert-danger">
        {{ $t("new_account_ledger.last_error") }}: {{ lastError }}
      </div>
    </div>
    <input
      id="slot"
      v-model="slot"
      type="number"
      min="0"
      max="2147483647"
      step="1"
      class="form-control my-2"
    />
    <div>
      <button
        class="btn my-2"
        @click="clickAddress"
        :class="this.address ? 'btn-light' : 'btn-primary'"
      >
        {{ $t("new_account_ledger.connect") }}
      </button>
    </div>
    <div v-if="address">
      <div>
        {{ $t("new_account_ledger.slot") }} {{ loadedSlot }}
        {{ $t("new_account_ledger.address") }}: {{ address }}
      </div>
      <div v-if="this.address0 != this.address">
        {{ $t("new_account_ledger.primary_address") }}: {{ address0 }}
      </div>
      <h3>{{ $t("new_account_ledger.account_name") }}</h3>
      <input v-model="name" class="form-control my-2" />
      <button class="btn btn-primary my-2" @click="clickSave">
        {{ $t("new_account_ledger.save_address") }}
      </button>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

import { mapActions } from "vuex";
export default {
  data() {
    return {
      slot: 0,
      loadedSlot: 0,
      address0: "",
      lastError: "",
      address: "",
      name: "",
    };
  },
  components: {
    MainLayout,
  },
  mounted() {
    this.lastError = "";
    this.prolong();
  },
  watch: {
    slot() {
      if (this.address && this.address0) {
      }
    },
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      openError: "toast/openError",
      addLedgerAccount: "wallet/addLedgerAccount",
    }),
    async loadAddress(slot, storeZero) {
      try {
        this.prolong();
        const transport = await TransportWebUSB.request();
        const algo = new Algorand(transport);
        const getAddressOfSlot = `44'/283'/${slot}'/0/0`;
        console.log(`Sending to ledger: ${getAddressOfSlot}`);
        const address = await algo.getAddress(getAddressOfSlot);
        if (storeZero) {
          this.address0 = address.address;
          console.log("this.address0", this.address0);
        } else {
          this.address = address.address;
          console.log("address", this.address);

          if (slot == 0) {
            this.address0 = address.address;
            console.log("this.address0", this.address0);
          }
        }
      } catch (Error) {
        if (Error.message == "Ledger device: UNKNOWN_ERROR (0x6b0c)") {
          Error = "Please connect your Ledger device (0x6b0c)";
        }
        console.error(Error);
        this.lastError = Error;
        this.openError(this.lastError);
      }
    },
    async clickAddress() {
      try {
        this.lastError = "";
        this.loadedSlot = this.slot;
        await this.loadAddress(this.slot, false);

        if (this.address && !this.address0) {
          await this.loadAddress(0, true);
        }
      } catch (Error) {
        console.error(Error);
        this.lastError = Error;
      }
    },
    async clickSave() {
      try {
        this.lastError = "";
        await this.addLedgerAccount({
          name: this.name,
          addr: this.address,
          addr0: this.address0,
          slot: this.slot,
        });
        this.$router.push({ name: "Accounts" });
      } catch (Error) {
        console.error(Error.message);
        if (Error.message == "Ledger device: UNKNOWN_ERROR (0x6b0c)") {
          Error = "Please connect your Ledger device (0x6b0c)";
        }
        this.lastError = Error;
      }
    },
  },
};
</script>

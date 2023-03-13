<template>
  <MainLayout>
    <h1>Add Ledger account</h1>
    <p>
      Ledger is a physical device - HW wallet which can store your private key.
      The maximum security for storing the assets on algorand is multisig
      account with all signators secured by ledger devices.
    </p>
    <div v-if="lastError">
      <div class="alert alert-danger">Last error: {{ lastError }}</div>
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
        Connect ledger and load algorand address
      </button>
    </div>
    <div v-if="address">
      <div>Slot {{ loadedSlot }} Address: {{ address }}</div>
      <div v-if="this.address0 != this.address">
        Primary address: {{ address0 }}
      </div>
      <h3>Account name</h3>
      <input v-model="name" class="form-control my-2" />
      <button class="btn btn-primary my-2" @click="clickSave">
        Save the address to the wallet
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

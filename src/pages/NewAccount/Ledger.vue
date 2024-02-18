<template>
  <MainLayout>
    <h1>{{ $t("new_account_ledger.header") }}</h1>

    <Card>
      <template #content>
        <p>
          {{ $t("new_account_ledger.description") }}
        </p>
        <div v-if="lastError">
          <Message severity="error">
            {{ $t("new_account_ledger.last_error") }}: {{ lastError }}
          </Message>
        </div>
        <div class="field grid">
          <label for="slot" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("new_account_ledger.slot") }}
          </label>
          <div class="col-12 md:col-10">
            <InputNumber
              showButtons
              inputId="slot"
              v-model="slot"
              :min="0"
              :max="2147483647"
              :step="1"
              class="w-full"
            />
          </div>
        </div>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button
              class="my-2"
              :severity="address ? 'secondary' : 'primary'"
              @click="clickAddress"
            >
              {{ $t("new_account_ledger.connect") }}
            </Button>
          </div>
        </div>
        <div class="field grid" v-if="address">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <div>
              {{ $t("new_account_ledger.slot") }} {{ loadedSlot }}
              {{ $t("new_account_ledger.address") }}: {{ address }}
            </div>
            <div v-if="address0 != address">
              {{ $t("new_account_ledger.primary_address") }}: {{ address0 }}
            </div>
          </div>
        </div>

        <div class="field grid">
          <label for="account_name" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("new_account_ledger.account_name") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText id="account_name" v-model="name" class="w-full" />
          </div>
        </div>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button class="my-2" @click="clickSave" :disabled="formInvalid">
              {{ $t("new_account_ledger.save_address") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
  },
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
  computed: {
    formInvalid() {
      return !(this.name && this.address0 && this.address);
    },
  },
  mounted() {
    this.lastError = "";
    this.prolong();
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
        const address = await algo.getAddress(getAddressOfSlot);
        if (storeZero) {
          this.address0 = address.address;
        } else {
          this.address = address.address;

          if (slot == 0) {
            this.address0 = address.address;
          }
        }
      } catch (Error) {
        let err = Error.message ?? Error;

        if (err == "Ledger device: UNKNOWN_ERROR (0x6b0c)") {
          err = "Please connect your Ledger device (0x6b0c)";
        }
        console.error(Error);
        this.lastError = err;
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
        let err = Error.message ?? Error;
        console.error(Error);
        if (err == "Ledger device: UNKNOWN_ERROR (0x6b0c)") {
          err = "Please connect your Ledger device (0x6b0c)";
        }
        this.lastError = err;
      }
    },
  },
};
</script>

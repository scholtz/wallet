<template>
  <PublicLayout>
    <h1>{{ $t("gateway.title") }}</h1>

    <Card>
      <template #content>
        <p>{{ $t("gateway.perex") }}</p>
        <div v-if="!build" class="grid">
          <div class="md:col-6">
            <h2>{{ $t("gateway.how") }}</h2>
            <ol class="list-group list-group-numbered">
              <li class="list-group-item">
                {{ $t("gateway.create_order") }}
              </li>
              <li class="list-group-item">
                {{ $t("gateway.redirect_to_gateway") }}
              </li>
              <li class="list-group-item">
                {{ $t("gateway.customer_pays") }}
              </li>
              <li class="list-group-item">
                {{ $t("gateway.customer_redirected") }}
              </li>
              <li class="list-group-item">
                {{ $t("gateway.use_your_money") }}
              </li>
            </ol>
          </div>
          <div class="md:col-6">
            <h2>{{ $t("gateway.security") }}</h2>
            <ul class="list-group">
              <li class="list-group-item">
                <input
                  class="form-check-input me-1"
                  type="checkbox"
                  checked
                  disabled
                />
                {{ $t("gateway.opensource") }}
              </li>
              <li class="list-group-item">
                <input
                  class="form-check-input me-1"
                  type="checkbox"
                  checked
                  disabled
                />
                {{ $t("gateway.you_make_details") }}
              </li>
              <li class="list-group-item">
                <input
                  class="form-check-input me-1"
                  type="checkbox"
                  checked
                  disabled
                />
                {{ $t("gateway.just_website") }}
              </li>
              <li class="list-group-item">
                <input
                  class="form-check-input me-1"
                  type="checkbox"
                  checked
                  disabled
                />
                {{ $t("gateway.no_restrictions") }}
              </li>
            </ul>
          </div>
        </div>
        <div class="grid">
          <div class="md:col-12">
            <Button v-if="!build" @click="build = true">
              {{ $t("gateway.turn_on_build_tool") }}
            </Button>
            <Button v-if="build" @click="build = false">
              {{ $t("gateway.turn_off_build_tool") }}
            </Button>
          </div>
        </div>
        <div class="grid">
          <div v-if="!build" class="md:col-12">
            <h2>{{ $t("gateway.allowed_parameters") }}</h2>
            <p>{{ $t("gateway.parameters_perex") }}</p>
          </div>

          <div class="md:col-6">
            <h2>{{ $t("gateway.payment_info_params") }}</h2>
            <div class="field grid">
              <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("gateway.asset")
              }}</label>
              <div class="col-12 md:col-10">
                <Dropdown
                  v-if="build"
                  filter
                  id="asset"
                  v-model="asset"
                  :options="assets"
                  :title="$t('gateway.asset')"
                  optionLabel="name"
                  optionValue="code"
                >
                  <template #option="slotProps">
                    <div
                      v-if="slotProps.option"
                      class="flex align-items-center"
                    >
                      <div>
                        {{ slotProps.option.name }} ({{
                          slotProps.option.code
                        }})
                      </div>
                    </div>
                  </template>
                </Dropdown>
                <span v-if="!build">
                  <code>asset</code> - {{ $t("gateway.asset") }}
                </span>
              </div>
            </div>
            <div class="field grid">
              <label for="pay_to" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("pay.pay_to")
              }}</label>
              <div class="col-12 md:col-10">
                <InputText
                  v-if="build"
                  id="pay_to"
                  v-model="payTo"
                  class="w-full"
                  :placeholder="$t('pay.pay_to')"
                  :title="$t('pay.pay_to')"
                />
                <span v-if="!build">
                  <code>addr</code> - {{ $t("pay.pay_to") }}
                </span>
              </div>
            </div>
            <div class="field grid">
              <label for="amount" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("pay.amount")
              }}</label>
              <div class="col-12 md:col-10">
                <InputGroup v-if="build">
                  <InputNumber
                    inputId="amount"
                    v-model="amount"
                    inputClass="w-full"
                    class="w-full"
                    :placeholder="$t('pay.amount')"
                    :title="$t('pay.amount')"
                    type="number"
                    :min="0"
                    :max="1999999999"
                    :step="0.000001"
                    :maxFractionDigits="6"
                  />
                  <InputGroupAddon>{{ assetName }}</InputGroupAddon>
                </InputGroup>
                <span v-if="!build">
                  <code>amount</code> - {{ $t("pay.amount") }},
                  {{ $t("gateway.amount") }}
                </span>
              </div>
            </div>
            <div class="field grid">
              <label
                for="matching_symbol"
                class="col-12 mb-2 md:col-2 md:mb-0"
                >{{ $t("merchant.matching_symbol") }}</label
              >
              <div class="col-12 md:col-10">
                <InputText
                  v-if="build"
                  id="matching_symbol"
                  v-model="xnote"
                  class="w-full"
                  :placeholder="$t('merchant.matching_symbol')"
                  :title="$t('merchant.matching_symbol')"
                />
                <span v-if="!build">
                  <code>xnote</code> - {{ $t("merchant.matching_symbol") }}
                </span>
              </div>
            </div>
            <div class="field grid">
              <label for="fee" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("pay.fee")
              }}</label>
              <div v-if="build">
                <div class="col-12 md:col-10">
                  <InputGroup>
                    <InputNumber
                      v-if="build"
                      inputId="fee"
                      v-model="fee"
                      inputClass="w-full"
                      class="w-full"
                      :placeholder="$t('pay.fee')"
                      :title="$t('pay.fee')"
                      type="number"
                      :min="0.001"
                      :max="1"
                      :step="0.000001"
                      :maxFractionDigits="6"
                    />
                    <InputGroupAddon>{{ $t("common.algo") }}</InputGroupAddon>
                  </InputGroup>
                </div>
                <span v-if="!build">
                  <code>fee</code> - {{ $t("pay.fee") }},
                  {{ $t("gateway.fee") }}
                </span>
              </div>
            </div>
          </div>
          <div class="md:col-6">
            <h2>{{ $t("gateway.settings_params") }}</h2>
            <div class="field grid">
              <label for="success" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("gateway.success")
              }}</label>
              <div class="col-12 md:col-10">
                <InputText
                  v-if="build"
                  id="success"
                  v-model="success"
                  class="w-full"
                  :placeholder="$t('gateway.success')"
                />
                <span v-if="!build">
                  <code>success</code> - {{ $t("gateway.success") }}
                </span>
              </div>
            </div>
            <div class="field grid">
              <label for="cancel" class="col-12 mb-2 md:col-2 md:mb-0">{{
                $t("gateway.cancel")
              }}</label>
              <div class="col-12 md:col-10">
                <InputText
                  id="cancel"
                  v-if="build"
                  v-model="cancel"
                  class="w-full"
                  :placeholder="$t('gateway.cancel')"
                />
                <span v-if="!build">
                  <code>cancel</code> - {{ $t("gateway.cancel") }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="build && !dataOk" class="grid">
          <div class="md:col-12">
            <Message severity="error" class="my-2">
              {{ $t("gateway.error_transaction") }}
            </Message>
          </div>
        </div>
        <div v-if="build && !settingsOk" class="grid">
          <div class="md:col-12">
            <Message severity="error" class="my-2">
              {{ $t("gateway.error_url") }}
            </Message>
          </div>
        </div>
        <div v-if="build && dataOk && settingsOk" class="grid">
          <div class="md:col-6">
            <h2>{{ $t("gateway.button") }}</h2>
            <div>
              <label>{{ $t("gateway.payment_info") }}</label>
              <div>
                <code>
                  {{ paymentinfo }}
                </code>
              </div>
            </div>
            <div>
              <label>{{ $t("gateway.payment_info") }} base64url</label>
              <div>
                <code>
                  {{ paymentinfoB64 }}
                </code>
              </div>
            </div>
          </div>
          <div class="md:col-6">
            <div>
              <label>{{ $t("gateway.callback_configuration") }}</label>
              <div>
                <code>
                  {{ callbackConfig }}
                </code>
              </div>
            </div>
            <div>
              <label
                >{{ $t("gateway.callback_configuration") }} base64url</label
              >
              <div>
                <code>
                  {{ callbackConfigB64 }}
                </code>
              </div>
            </div>
          </div>
        </div>
        <div v-if="build && dataOk && settingsOk" class="grid">
          <div class="md:col-12">
            <div>
              <label>{{ $t("gateway.link") }}</label>
              <div>
                <code>
                  {{ url }}
                </code>
              </div>
            </div>
            <div>
              <label>{{ $t("gateway.html_example") }}</label>
              <div>
                <code>
                  &lt;a href="{{ url }}" &gt;{{ $t("merchant.pay") }}&lt;/a&gt;
                </code>
              </div>
            </div>
            <br />
            <a :href="url" target="_blank" rel="noreferrer">
              <Button>{{ $t("buttons.try_it_out") }}</Button>
            </a>
          </div>
        </div>
        <div v-if="!build" class="grid">
          <div class="md:col-12">
            <h2>{{ $t("gateway.example") }}</h2>
            <code
              class="my-2"
              style="
                overflow-wrap: anywhere;
                word-wrap: break-word;
                hyphens: auto;
              "
            >
              &lt;a
              href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0LyIsImNhbmNlbCI6Imh0dHBzOi8vd3d3LmEtd2FsbGV0Lm5ldC8ifQ=="
              &gt;{{ $t("merchant.pay") }}&lt;/a&gt;
            </code>
            <br />
            <a
              href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0LyIsImNhbmNlbCI6Imh0dHBzOi8vd3d3LmEtd2FsbGV0Lm5ldC8ifQ=="
            >
              <Button> Pay </Button>
            </a>
          </div>
        </div>
      </template>
    </Card>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import base64url from "base64url";
import { Buffer } from "buffer";
window.Buffer = Buffer;

export default {
  components: {
    PublicLayout,
  },
  data() {
    return {
      build: false,
      payTo: "",
      asset: "0",
      amount: 0,
      xnote: "",
      fee: 0.001,
      success: "",
      cancel: "",
      assets: [
        { name: "Algorand", code: "0" },
        { name: "USDt", code: "312769" },
        { name: "USDc", code: "31566704" },
        { name: "gAlgo", code: "793124631" },
        { name: "goBTC", code: "386192725" },
        { name: "goETH", code: "386195940" },
        { name: "goUSD", code: "672913181" },
        { name: "xUSD", code: "760037151" },
        { name: "Chips", code: "388592191" },
        { name: "Defly", code: "470842789" },
        { name: "Opulous", code: "287867876" },
        { name: "Vestige", code: "700965019" },
        { name: "CoopCoin", code: "796425061" },
        { name: "Gora", code: "1138500612" },
        { name: "VoteCoin", code: "452399768" },
      ],
    };
  },
  computed: {
    dataOk() {
      return !!this.payTo && !!this.amount;
    },
    settingsOk() {
      if (this.success && !this.success.startsWith("https://")) return false;
      if (this.cancel && !this.success.startsWith("https://")) return false;
      return true;
    },
    url() {
      let host = window.location.hostname;
      if (window.location.port) {
        host += ":" + window.location.port;
      }
      return (
        window.location.protocol +
        "//" +
        host +
        "/gateway/" +
        this.paymentinfoB64 +
        "/" +
        this.callbackConfigB64
      );
    },
    assetName() {
      const asset = this.assets.find((a) => a.code == this.asset);
      if (!asset) return "Algo";
      return asset.name;
    },
    paymentinfo() {
      let ret = "algorand://";
      ret += this.payTo;
      ret += "?amount=" + Math.round(this.amount * 1000000);
      if (this.xnote) {
        ret += "&xnote=" + this.xnote;
      }
      if (this.asset > 0) {
        ret += "&asset=" + this.asset;
      }
      if (this.fee && this.fee > 0.001) {
        ret += "&fee=" + Math.round(this.fee * 1000000);
      }
      return ret;
    },
    paymentinfoB64() {
      if (!this.paymentinfo) return "";
      var buffer = Buffer.from(this.paymentinfo, "utf8");
      return base64url(buffer);
    },
    callbackConfig() {
      let ret = {};
      if (this.success) ret.success = this.success;
      if (this.cancel) ret.cancel = this.cancel;
      return JSON.stringify(ret);
    },
    callbackConfigB64() {
      if (!this.callbackConfig) return "";
      return base64url(this.callbackConfig);
    },
  },
  mounted() {
    this.payTo = this.$store.state.wallet.lastActiveAccount;
  },
};
</script>

<template>
  <PublicLayout>
    <h1>{{ $t("gateway.title") }}</h1>
    <p>{{ $t("gateway.perex") }}</p>
    <div class="row" v-if="!build">
      <div class="col-md-6">
        <h2>{{ $t("gateway.how") }}</h2>
        <ol class="list-group list-group-numbered">
          <li class="list-group-item">{{ $t("gateway.create_order") }}</li>
          <li class="list-group-item">
            {{ $t("gateway.redirect_to_gateway") }}
          </li>
          <li class="list-group-item">{{ $t("gateway.customer_pays") }}</li>
          <li class="list-group-item">
            {{ $t("gateway.customer_redirected") }}
          </li>
          <li class="list-group-item">{{ $t("gateway.use_your_money") }}</li>
        </ol>
      </div>
      <div class="col-md-6">
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
    <div class="row">
      <div class="col-md-12 my-2">
        <button v-if="!build" class="btn btn-primary" @click="build = true">
          {{ $t("gateway.turn_off_build_tool") }}
        </button>
        <button v-if="build" class="btn btn-primary" @click="build = false">
          {{ $t("gateway.turn_off_build_tool") }}
        </button>
      </div>
    </div>
    <div class="row">
      <div class="col-md-12" v-if="!build">
        <h2>{{ $t("gateway.allowed_parameters") }}</h2>
        <p>{{ $t("gateway.parameters_perex") }}</p>
      </div>

      <div class="col-md-6">
        <h2>{{ $t("gateway.payment_info_params") }}</h2>
        <ul class="list-group">
          <li class="list-group-item">
            <select
              class="form-control"
              v-model="asset"
              v-if="build"
              :title="$t('gateway.asset')"
            >
              <option value="312769">{{ $t("gateway.tether") }}</option>
              <option value="">Algorand</option>
            </select>
            <span v-if="!build">
              <code>asset</code> - {{ $t("gateway.asset") }}
            </span>
          </li>
          <li class="list-group-item">
            <input
              v-model="payTo"
              v-if="build"
              class="form-control"
              :placeholder="$t('pay.pay_to')"
              :title="$t('pay.pay_to')"
            />
            <span v-if="!build">
              <code>addr</code> - {{ $t("pay.pay_to") }}
            </span>
          </li>
          <li class="list-group-item">
            <div class="input-group" v-if="build">
              <input
                v-model="amount"
                class="form-control"
                :placeholder="$t('pay.amount')"
                :title="$t('pay.amount')"
                type="number"
                min="0"
                max="1999999999"
                step="0.000001"
              />
              <span class="input-group-text">{{ assetName }}</span>
            </div>
            <span v-if="!build">
              <code>amount</code> - {{ $t("pay.amount") }},
              {{ $t("gateway.amount") }}
            </span>
          </li>
          <li class="list-group-item">
            <input
              v-model="xnote"
              v-if="build"
              class="form-control"
              :placeholder="$t('merchant.matching_symbol')"
              :title="$t('merchant.matching_symbol')"
            />
            <span v-if="!build">
              <code>xnote</code> - {{ $t("merchant.matching_symbol") }}
            </span>
          </li>
          <li class="list-group-item">
            <div class="input-group" v-if="build">
              <input
                v-model="fee"
                v-if="build"
                class="form-control"
                :placeholder="$t('pay.fee')"
                :title="$t('pay.fee')"
                type="number"
                min="0.001"
                max="1"
                step="0.000001"
              />
              <span class="input-group-text">Algo</span>
            </div>
            <span v-if="!build">
              <code>fee</code> - {{ $t("pay.fee") }}, {{ $t("gateway.fee") }}
            </span>
          </li>
        </ul>
      </div>
      <div class="col-md-6">
        <h2>{{ $t("gateway.settings_params") }}</h2>
        <ul class="list-group">
          <li class="list-group-item">
            <input
              v-model="success"
              v-if="build"
              class="form-control"
              :placeholder="$t('gateway.success')"
            />
            <span v-if="!build">
              <code>success</code> - {{ $t("gateway.success") }}
            </span>
          </li>
          <li class="list-group-item">
            <input
              v-model="cancel"
              v-if="build"
              class="form-control"
              :placeholder="$t('gateway.cancel')"
            />
            <span v-if="!build">
              <code>cancel</code> - {{ $t("gateway.cancel") }}
            </span>
          </li>
        </ul>
      </div>
    </div>
    <div class="row" v-if="build && !dataOk">
      <div class="col-md-12">
        <div class="alert alert-danger my-2">
          {{ $t("gateway.error_transaction") }}
        </div>
      </div>
    </div>
    <div class="row" v-if="build && !settingsOk">
      <div class="col-md-12">
        <div class="alert alert-danger my-2">
          {{ $t("gateway.error_url") }}
        </div>
      </div>
    </div>
    <div class="row" v-if="build && dataOk && settingsOk">
      <div class="col-md-6">
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
      <div class="col-md-6">
        <div>
          <label>{{ $t("gateway.callback_configuration") }}</label>
          <div>
            <code>
              {{ callbackConfig }}
            </code>
          </div>
        </div>
        <div>
          <label>{{ $t("gateway.callback_configuration") }} base64url</label>
          <div>
            <code>
              {{ callbackConfigB64 }}
            </code>
          </div>
        </div>
      </div>
    </div>
    <div class="row" v-if="build && dataOk && settingsOk">
      <div class="col-md-12">
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
              &lt;a href="{{ url }}" class="btn btn-primary" &gt;{{
                $t("merchant.pay")
              }}&lt;/a&gt;
            </code>
          </div>
        </div>
        <br />
        <a :href="url" target="_blank" rel="noreferrer" class="btn btn-primary">
          Try it out
        </a>
      </div>
    </div>
    <div class="row" v-if="!build">
      <div class="col-md-12">
        <h2>{{ $t("gateway.example") }}</h2>
        <code>
          &lt;a
          href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0LyIsImNhbmNlbCI6Imh0dHBzOi8vd3d3LmEtd2FsbGV0Lm5ldC8ifQ=="
          class="btn btn-primary" &gt;{{ $t("merchant.pay") }}&lt;/a&gt;
        </code>
        <br />
        <a
          href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0LyIsImNhbmNlbCI6Imh0dHBzOi8vd3d3LmEtd2FsbGV0Lm5ldC8ifQ=="
          class="btn btn-primary"
        >
          Pay
        </a>
      </div>
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import base64url from "base64url";

export default {
  data() {
    return {
      build: false,
      payTo: "",
      asset: "312769",
      amount: 0,
      xnote: "",
      fee: 0.001,
      success: "",
      cancel: "",
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
      if (this.asset == 312769) {
        return "USDt";
      }
      return "Algo";
    },
    paymentinfo() {
      let ret = "algorand://";
      ret += this.payTo;
      ret += "?amount=" + Math.round(this.amount * 1000000);
      if (this.xnote) {
        ret += "&xnote=" + this.xnote;
      }
      if (this.asset) {
        ret += "&asset=" + this.asset;
      }
      if (this.fee && this.fee > 0.001) {
        ret += "&fee=" + Math.round(this.fee * 1000000);
      }
      return ret;
    },
    paymentinfoB64() {
      return base64url(this.paymentinfo);
    },
    callbackConfig() {
      let ret = {};
      if (this.success) ret.success = this.success;
      if (this.cancel) ret.cancel = this.cancel;
      return JSON.stringify(ret);
    },
    callbackConfigB64() {
      return base64url(this.callbackConfig);
    },
  },
  components: {
    PublicLayout,
  },
};
</script>
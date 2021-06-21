<template>
  <PublicLayout>
    <h1>{{ $t("gateway.title") }}</h1>
    <p>{{ $t("gateway.perex") }}</p>
    <div class="row">
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
      <div class="col-md-12">
        <h2>{{ $t("gateway.allowed_parameters") }}</h2>
        <p>{{ $t("gateway.parameters_perex") }}</p>
      </div>

      <div class="col-md-6">
        <h2>{{ $t("gateway.payment_info_params") }}</h2>
        <ul class="list-group">
          <li class="list-group-item">
            <code>addr</code> - {{ $t("pay.pay_to") }}
          </li>
          <li class="list-group-item">
            <code>amount</code> - {{ $t("pay.amount") }},
            {{ $t("gateway.amount") }}
          </li>
          <li class="list-group-item">
            <code>xnote</code> - {{ $t("merchant.matching_symbol") }}
          </li>
          <li class="list-group-item">
            <code>fee</code> - {{ $t("pay.fee") }}, {{ $t("gateway.fee") }}
          </li>
        </ul>
      </div>
      <div class="col-md-6">
        <h2>{{ $t("gateway.settings_params") }}</h2>
        <ul class="list-group">
          <li class="list-group-item">
            <code>success</code> - {{ $t("gateway.success") }}
          </li>
          <li class="list-group-item">
            <code>cancel</code> - {{ $t("gateway.cancel") }}
          </li>
        </ul>
      </div>
    </div>
    <div class="row">
      <div class="col-md-12">
        <h2>{{ $t("gateway.example") }}</h2>
        <code>
          &lt;a
          href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0LyIsImNhbmNlbCI6Imh0dHBzOi8vd3d3LmEtd2FsbGV0Lm5ldC8ifQ=="
          class="btn btn-primary" &gt; Pay &lt;/a&gt;
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

export default {
  components: {
    PublicLayout,
  },
};
</script>
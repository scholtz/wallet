<template>
  <PublicLayout>
    <h1>{{ $t("donation.title") }}</h1>

    <Card>
      <template #content>
        <div class="grid">
          <div class="col-9">
            <p>
              {{ $t("donation.project_intro") }}
            </p>
            <p>
              {{ $t("donation.funding_received") }}
              <a
                href="https://github.com/algorandfoundation/xGov/pull/9/files"
                >{{ $t("donation.twofa_accounts") }}</a
              >
              {{ $t("donation.and") }}
              <a
                href="https://github.com/algorandfoundation/xGov/pull/90/files"
                >{{ $t("donation.payment_scheduler") }}</a
              >.
            </p>
            <p>
              {{ $t("donation.community_active") }}
              <a href="https://www.a-dir.net/">{{
                $t("donation.algorand_directory")
              }}</a
              >{{ $t("donation.wallet_support") }}
              <a
                href="https://www.a-wallet.net/payment-gateway/AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
                >{{ $t("donation.payment_gateway") }}</a
              >
              {{ $t("donation.no_middleman") }}
              <a href="https://algo-donate.vercel.app/">{{
                $t("donation.donation_web")
              }}</a
              >.
            </p>
            <p>
              {{ $t("donation.future_vision") }}
            </p>
            <ol>
              <li>
                {{ $t("donation.graphics_designer") }}
                <a
                  href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAwMCZhc3NldD0zMTI3Njk/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
                >
                  <Button>{{ $t("donation.donate_now") }}</Button>
                </a>
              </li>
              <li>
                {{ $t("donation.translation_cost") }}
                <a
                  href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9NTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
                >
                  <Button>{{ $t("donation.donate_now") }}</Button>
                </a>
              </li>
              <li>
                {{ $t("donation.magento_gateway") }}
                <a
                  href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAwMCZhc3NldD0zMTI3Njk/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
                >
                  <Button>{{ $t("donation.donate_now") }}</Button>
                </a>
              </li>
            </ol>
            <p>
              {{ $t("donation.accept_donations") }}

              <a
                target="_blank"
                rel="noreferrer"
                href="https://allo.info/address/AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
                ><b
                  >AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y</b
                ></a
              >
            </p>
            <p>{{ $t("donation.thank_you") }}</p>
            <p>&nbsp;&nbsp;{{ $t("donation.ludo_scholtz") }}</p>
            <p>&nbsp;&nbsp;{{ $t("donation.company_name") }}</p>
          </div>
          <div class="col-3">
            <p>
              <a
                href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDA/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
                class="d-md-none d-lg-block"
              >
                <QRCodeVue3
                  :width="400"
                  :height="400"
                  value="AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
                  :qr-options="{ errorCorrectionLevel: 'H' }"
                  image="/img/algorand-algo-logo-96.png"
                />
              </a>
            </p>
          </div>
        </div>
      </template>
    </Card>
  </PublicLayout>
</template>

<script>
import QRCodeVue3 from "qrcode-vue3";
import PublicLayout from "../layouts/Public.vue";
export default {
  components: {
    PublicLayout,
    QRCodeVue3,
  },
};
</script>

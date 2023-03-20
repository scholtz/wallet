<template>
  <PublicLayout>
    <h1>Please help us</h1>
    <div class="row">
      <div class="col-9">
        <p>
          Algorand foundation nor Algorand inc, nor any algorand fund has funded
          this project.
        </p>
        <p>
          We are active in algorand community. We have created
          <a href="https://www.a-dir.net/">Algorand Directory</a>, besides the
          wallet support, we have created the
          <a
            href="https://www.a-wallet.net/payment-gateway/AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
            >payment gateway</a
          >
          which does not require any financial middleman, we have created open
          source decentralized voting system built on the algorand network, and
          we have built the decentralized
          <a href="https://algo-donate.vercel.app/">donation web</a>.
        </p>
        <p>
          We have several visions where we can help the algorand community grow.
        </p>
        <ol>
          <li>
            We would like to hire graphics designer to improve the Look&amp;Feel
            of the AWallet. We expect costs approximately 1000 USDt.
            <a
              href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAwMCZhc3NldD0zMTI3Njk/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
              class="btn btn-primary"
              >Donate now</a
            >
          </li>
          <li>
            Translation to other language costs approx 50 USD. Please send us in
            the note info to which language you would like the AWallet to be
            translated.
            <a
              href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9NTAwMDAwMDAmYXNzZXQ9MzEyNzY5/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
              class="btn btn-primary"
              >Donate now</a
            >
          </li>
          <li>
            Payment gateway implementation to Magento - No middleman, you accept
            the payments to your account, match with invoices
            <a
              href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDAwMCZhc3NldD0zMTI3Njk/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
              class="btn btn-primary"
              >Donate now</a
            >
          </li>
        </ol>
        <p>
          We accept donations to this account:

          <a
            target="_blank"
            rel="noreferrer"
            href="https://algoexplorer.io/address/AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
            ><b
              >AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y</b
            ></a
          >
        </p>
        <p>Thank you</p>
        <p>&nbsp;&nbsp;Ludo Scholtz</p>
        <p>&nbsp;&nbsp;Scholtz&amp;Company, jsa</p>
      </div>
      <div class="col-3">
        <p>
          <a
            href="https://www.a-wallet.net/gateway/YWxnb3JhbmQ6Ly9QNjVMWEhBNU1FRE1PSjJaQUlUTFpXWVNVNlcyNUJGMkZDWEo1S1FSRFVCMk5UMlQ3RFBBQUZZVDNVPyZhbW91bnQ9MTAwMDAwMDA/eyJzdWNjZXNzIjoiaHR0cHM6Ly93d3cuYS13YWxsZXQubmV0L3N1Y2Nlc3MiLCJjYW5jZWwiOiJodHRwczovL3d3dy5hLXdhbGxldC5uZXQvZG9uYXRlIn0"
          >
            <QRCodeVue3
              class="d-md-none d-lg-block"
              :width="400"
              :height="400"
              value="AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
              :qrOptions="{ errorCorrectionLevel: 'H' }"
              image="/img/algorand-algo-logo-96.png"
            />
          </a>
        </p>
      </div>
    </div>
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

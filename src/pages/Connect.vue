<template>
  <MainLayout>
    <h1>Wallet connect</h1>
    <QrcodeStream @decode="onDecodeQR" v-if="!data" />
    <code>{{data}}</code>
  </MainLayout>
</template>
<script>
import { QrcodeStream } from "qrcode-reader-vue3";
import MainLayout from "../layouts/Main.vue";
import WalletConnect from "@walletconnect/client";

export default {
  components: {
    QrcodeStream,
    MainLayout,
  },
  data(){
      return{
          data:"wc:36da1854-8fef-4271-a3fb-e5c28549bf67@1?bridge=https%3A%2F%2Fb.bridge.walletconnect.org&key=7497c342984c96b17651b34178f1ef51cc674ccc8f1a67a5ac38366a33a55304",
          
          connector: null
      }
  },
  mounted(){
    // Create WalletConnector
    this.connector = new WalletConnect(
    {
        // Required
        uri: this.data,
        // Required
        clientMeta: {
            description: "AWallet is open source algo wallet",
            url: "https://www.a-wallet.net",
            icons: ["https://www.a-wallet.net/img/logo.svg"],
            name: "AWallet",
            },
        }
    );

// Subscribe to session requests
this.connector.on("session_request", (error, payload) => {
  console.log("session_request",error,payload)
  if (error) {
    throw error;
  }
  // Handle Session Request

  /* payload:
  {
    id: 1,
    jsonrpc: '2.0'.
    method: 'session_request',
    params: [{
      peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
      peerMeta: {
        name: "WalletConnect Example",
        description: "Try out WalletConnect v1.x.x",
        icons: ["https://example.walletconnect.org/favicon.ico"],
        url: "https://example.walletconnect.org"
      }
    }]
  }
  */
});

// Subscribe to call requests
this.connector.on("call_request", (error, payload) => {
  console.log("call_request",error,payload)
  if (error) {
    throw error;
  }

  // Handle Call Request

  /* payload:
  {
    id: 1,
    jsonrpc: '2.0'.
    method: 'eth_sign',
    params: [
      "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
      "My email is john@doe.com - 1537836206101"
    ]
  }
  */
});

this.connector.on("disconnect", (error, payload) => {
  console.log("disconnect",error,payload)
  if (error) {
    throw error;
  }

  // Delete connector
});
    console.log("this.connector",this.connector)
    /*
const approve = this.connector.approveSession({
  accounts: [                 // required
    this.$route.params.account
  ],
  chainId: 1                  // required
})
console.log("approve",approve)
*/
  },
  methods:{
    onDecodeQR(result) {
        console.log("result",result)
        if(result.startsWith("wc:")){
            this.data = result
        }
    }
  }
}
</script>

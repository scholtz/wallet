# AWallet

Algorand community wallet built by community for community, fully open source since 2021

## News channel is Algorand Forum

https://forum.algorand.org/t/algorand-wallet-open-source/3497

## Supported features

- Creating wallet / Export wallet / Import wallet / Destroying wallet / Algo25 Shamir backup
- Creating account, Creating multisign account, Adding public account
- Account overview
- Transaction overview
- Sending algo payment, Signing and sending multisig payments
- Multilanguage support
- Rekeying of standard accounts, multisig accounts and rekeyed accounts
- Connecting to DApps using WalletConnect

Source code: https://github.com/scholtz/wallet

Technology stack: Vue3, JsAlgoSDK, CICD to pure HTML+JS

Docker image: https://hub.docker.com/r/scholtz2/a-wallet/tags

Please create a pull request for contribution to the project.

## Deployments

https://wallet.biatec.io - Most stable deployment - Private onprem K8S cluster run by Scholtz&Co. Docker image released after some time in main branch deployment.

## AWallet

https://www.a-wallet.net - The biatec wallet has been started under brand name AWallet. Under this domain is the same deployment as under the biatec domain with most stable deployment. Note that this environment is deprecated and https://wallet.biatec.io is prefered domain to use the biatec wallet.

## Main branch deployments

- https://main.h3.a-wallet.net - Private onprem K8S cluster run by Scholtz&Co
- https://ww2.a-wallet.net - Built by github and hosted on github pages
- https://vercel.a-wallet.net - Built and hosted by vercel
- https://awallet.vercel.app - Built and hosted by vercel on vercel domain

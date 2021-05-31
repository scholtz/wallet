<template>
  <PublicLayout>
    <Accordion :activeIndex="0">
      <AccordionTab header="About the wallet">
        <p>
          Algo wallet application has been initially created by Scholtz &
          Company, jsa. Open source, html only, coroporate friendly, and
          security are the main advantages for its usage.
        </p> </AccordionTab
      ><AccordionTab header="How is my wallet data secured?">
        <p>
          Your data is in the browser only. It is stored in persistant index db.
          Every wallet is encrypted using aes256 with your password. If you make
          strong enough password, your wallet will never be brute-forced. The
          password does not leave your computer and resides only in the browser
          cache. After 5 minutes after the login the cache is destroyed.
        </p>
      </AccordionTab>
      <AccordionTab header="Does my wallet password go to the internet?">
        <p>Never</p>
      </AccordionTab>
      <AccordionTab header="How can I change the wallet password?">
        <ol>
          <li>Login and access your wallet</li>
          <li>Navigate to settings.</li>
          <li>Type old password, new password, and confirm new password.</li>
          <li>Submit form and your password will be changed.</li>
        </ol>
      </AccordionTab>
      <AccordionTab header="Can I move my wallet to other computer?">
        <ol>
          <li>Login and access your wallet</li>
          <li>Navigate to settings.</li>
          <li>Go to section backup and save your data to the local file.</li>
          <li>
            In the other computer go to new wallet, import wallet, and upload
            the downloaded file to the other browser storage.
          </li>
          <li>
            Access the wallet with the same password as before. You can change
            the password in settings.
          </li>
        </ol>
      </AccordionTab>
      <AccordionTab header="Can I check your source code?">
        <p>
          Yes. https://github.com/scholtz/wallet/ This wallet was made open
          source and is free to be used, copied or modified even for commercial
          purposes. If you are able to participate in the project, please be so
          kind and create a pull request with your improvement.
        </p>
      </AccordionTab>
      <AccordionTab header="How can I help the project?">
        <ol>
          <li>
            Donatation to algorand address
            P65LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U will help
            the project going. The project has not been funded from algorand inc
            nor algorand foundation.
          </li>
          <li>
            To translate project or help with the translation, please go to
            https://github.com/scholtz/wallet/tree/master/src, copy the
            translation file to your language and make a pull request.
          </li>
          <li>
            If you are a programmer, please do a code review, or help us in any
            way you think this project should be better.
          </li>
        </ol>
      </AccordionTab>
      <AccordionTab header="How to make multisignature account">
        <ol>
          <li>
            First create the accounts with the private keys or create public
            accounts. It is better to give them names you will remember its
            purpose.
          </li>
          <li>Go to create new addrress and select multisignature address.</li>
          <li>
            Select all accounts which can sign the transactions and select how
            many signatures are minimum for the network to accept the multisig
            payment.
          </li>
          <li>
            After you create the multisignature account, you can access it from
            the accounts list page.
          </li>
        </ol>
      </AccordionTab>
    </Accordion>
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
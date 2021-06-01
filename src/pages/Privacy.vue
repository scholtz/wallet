  
<template>
  <PublicLayout>
    <h1>Privacy policy</h1>
    <Accordion :activeIndex="0">
      <AccordionTab header="What private information about me do you collect?">
        <p>
          None. Besides IP address and browser which is stored in logs for every
          internet service. We do not collect any form of private information
          such as your name, email or address.
        </p>
      </AccordionTab>
      <AccordionTab header="What do you store in cookies?">
        <p>
          Nothing. We do not use cookies. We use persistant local storage called
          indexdb for starage of your wallet.
        </p>
      </AccordionTab>
      <AccordionTab header="How do you collect analytics information?">
        <p>
          We do not. We do not use any form of analytics service eg google
          analytics, so that you can feel safer. The web is purly html with
          javascript, and we do know your IP address only when you request the
          server. Depending on your settings and your algod server or indexer,
          the selected server also may know your IP address.
        </p>
      </AccordionTab>
      <AccordionTab header="Does use of this service affect commercials I see?">
        <p>
          No. Commercial servers do not have any information from us about any
          usage. Only way how for example google may know you are using this
          service is that you access this site from google search.
        </p>
      </AccordionTab>
      <AccordionTab header="Who provides this service?">
        <p>
          Scholtz &amp; Company, jsa has created this service. If this is
          running in official website provided by Scholtz &amp; Co, the company
          is also service provider. The company is not liable for any service,
          nor any errors in the application.
        </p>
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
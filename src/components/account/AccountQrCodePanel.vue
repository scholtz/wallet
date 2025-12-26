<template>
  <div class="col-12 lg:col-3 lg:text-right d-md-none d-lg-block account-qr">
    <QRCodeVue3
      myclass="account-qr"
      :width="400"
      :height="400"
      :value="address"
      :qr-options="{ errorCorrectionLevel: 'H' }"
      image="/img/algorand-algo-logo-96.png"
      :image-options="{
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 10,
      }"
      :corners-square-options="{
        type: 'square',
        color: 'teal',
      }"
      :corners-dot-options="{
        type: 'square',
        color: 'teal',
        gradient: {
          type: 'linear',
          rotation: 0,
          colorStops: [
            { offset: 0, color: 'teal' },
            { offset: 1, color: '#003030' },
          ],
        },
      }"
      :dots-options="{
        type: 'square',
        color: 'teal',
        gradient: {
          type: 'linear',
          rotation: 0,
          colorStops: [
            { offset: 0, color: 'teal' },
            { offset: 1, color: '#003030' },
          ],
        },
      }"
    />
  </div>
</template>

<script setup lang="ts">
import QRCodeVue3 from "qrcode-vue3";

defineProps<{
  address: string;
}>();
</script>

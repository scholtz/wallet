<template>
  <PublicLayout>
    <Card>
      <template #title>{{ $t("changelog.title") }}</template>
      <template #content>
        <div class="changelog-content" v-html="html" />
      </template>
    </Card>
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import PublicLayout from "../layouts/Public.vue";
import changelogSource from "../../CHANGELOG.md?raw";

// Minimal markdown-to-HTML conversion, only covering the syntax actually
// used in CHANGELOG.md (headings, bullet lists, paragraphs, inline code).
// Not a general-purpose markdown renderer.
const renderInline = (text: string) =>
  text.replace(/`([^`]+)`/g, "<code>$1</code>");

const toHtml = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (/^## /.test(line)) {
      closeList();
      out.push(`<h2>${renderInline(line.slice(3))}</h2>`);
    } else if (/^# /.test(line)) {
      closeList();
      out.push(`<h1>${renderInline(line.slice(2))}</h1>`);
    } else if (/^- /.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${renderInline(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${renderInline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
};

// The card title already shows a translated heading, so drop the
// markdown's own leading "# Changelog" line to avoid showing it twice.
const html = computed(() =>
  toHtml(changelogSource.replace(/^# .*\n/, ""))
);
</script>

<style scoped>
.changelog-content :deep(h2) {
  margin-top: 1.5rem;
}
.changelog-content :deep(h2:first-child) {
  margin-top: 0;
}
</style>

<template>
  <PublicLayout>
    <Card>
      <template #title>{{ $t("changelog.title") }}</template>
      <template #content>
        <p
          v-tooltip.top="versionTooltip"
          class="m-0 mb-3 text-sm text-color-secondary"
        >
          {{ versionLabel }}
        </p>
        <div class="changelog-content" v-html="html" />
      </template>
    </Card>
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PublicLayout from "../layouts/Public.vue";
import changelogSource from "../../CHANGELOG.md?raw";

const { t } = useI18n();

const isLocalBuild = import.meta.env.VITE_BUILD_SOURCE === "local";
const versionLabel = computed(() => {
  const commit = import.meta.env.VITE_GIT_COMMIT;
  const date = new Date(import.meta.env.VITE_BUILD_DATE).toLocaleDateString();
  return isLocalBuild
    ? t("footer.version_local", { commit, date })
    : t("footer.version_built", { commit, date });
});
const versionTooltip = new Date(
  import.meta.env.VITE_BUILD_DATE
).toLocaleString();

// Minimal markdown-to-HTML conversion, only covering the syntax actually
// used in CHANGELOG.md (headings, bullet lists, paragraphs, inline code).
// Not a general-purpose markdown renderer.
//
// escapeHtml runs first on every line, before any tag is added, so raw
// "<"/">"/"&" in the source text (e.g. a bullet mentioning a component like
// "<Password>", or a pasted HTML/code snippet) can never be interpreted as
// markup by the v-html sink below (audit finding AW-2026-036).
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const renderInline = (text: string) =>
  escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");

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

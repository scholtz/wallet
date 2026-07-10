<template>
  <PublicLayout>
    <div class="faq-page">
      <div class="faq-hero">
        <i class="pi pi-question-circle faq-hero-icon" aria-hidden="true" />
        <h1 class="faq-hero-title">{{ $t("faq.title") }}</h1>
        <p class="faq-hero-subtitle">
          {{ $t("faq.subtitle", { name: brandName }) }}
        </p>
        <IconField class="faq-search">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="search"
            class="w-full"
            :placeholder="$t('faq.search_placeholder')"
            :aria-label="$t('faq.search_placeholder')"
          />
        </IconField>
      </div>

      <div v-if="search.trim() === ''" class="faq-category-nav">
        <a
          v-for="category in categories"
          :key="'nav-' + category.key"
          class="faq-category-chip"
          :href="'#faq-' + category.key"
        >
          <i :class="'pi ' + category.icon" aria-hidden="true" />
          <span>{{ $t(`faq.categories.${category.key}.title`) }}</span>
        </a>
      </div>

      <div v-if="filteredCategories.length === 0" class="faq-no-results">
        <i class="pi pi-search-minus" aria-hidden="true" />
        <p class="font-bold">{{ $t("faq.no_results_title") }}</p>
        <p class="text-color-secondary">{{ $t("faq.no_results_text") }}</p>
      </div>

      <div
        v-for="category in filteredCategories"
        :id="'faq-' + category.key"
        :key="category.key"
        class="faq-category"
      >
        <Card class="faq-category-card">
          <template #header>
            <div class="faq-category-header">
              <span class="faq-category-icon">
                <i :class="'pi ' + category.icon" aria-hidden="true" />
              </span>
              <div class="faq-category-heading">
                <h2>{{ $t(`faq.categories.${category.key}.title`) }}</h2>
                <Badge :value="category.items.length" severity="secondary" />
              </div>
            </div>
          </template>
          <template #content>
            <Accordion :multiple="true">
              <AccordionTab
                v-for="item in category.items"
                :key="item.q"
                :header="renderText(item.q, category.key)"
              >
                <!-- eslint-disable-next-line vue/no-v-html -- answer copy is static, developer-authored locale content (not user input); only the {name} interpolation is dynamic, and it is HTML-escaped in renderHtml() before substitution. -->
                <p class="faq-answer" v-html="renderHtml(item.a)" />
              </AccordionTab>
            </Accordion>
          </template>
        </Card>
      </div>

      <div class="faq-footer-note">
        <i class="pi pi-github" aria-hidden="true" />
        <span
          >{{ $t("faq.footer_note", { name: brandName }) }}
          <a
            href="https://github.com/scholtz/wallet/"
            target="_blank"
            rel="noopener noreferrer"
            >github.com/scholtz/wallet</a
          ></span
        >
      </div>
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import { getWalletBrandName } from "@/scripts/branding";

// Category order/icons are defined here (not localized); question/answer
// copy lives entirely in src/locales/*.json under faq.categories.<key>.
const CATEGORY_DEFS = [
  { key: "general", icon: "pi-info-circle", count: 5 },
  { key: "biatec", icon: "pi-building", count: 5 },
  { key: "blockchain", icon: "pi-sitemap", count: 5 },
  { key: "security", icon: "pi-shield", count: 5 },
  { key: "accounts", icon: "pi-users", count: 5 },
  { key: "actions", icon: "pi-bolt", count: 5 },
  { key: "assets", icon: "pi-tags", count: 5 },
  { key: "swap", icon: "pi-arrow-right-arrow-left", count: 5 },
  { key: "connect", icon: "pi-qrcode", count: 5 },
  { key: "backup", icon: "pi-save", count: 5 },
];

export default {
  components: {
    PublicLayout,
  },
  data() {
    return {
      search: "",
    };
  },
  computed: {
    brandName() {
      return getWalletBrandName();
    },
    categories() {
      return CATEGORY_DEFS.map((def) => ({
        ...def,
        items: Array.from({ length: def.count }, (_, i) => ({
          q: `faq.categories.${def.key}.q${i + 1}`,
          a: `faq.categories.${def.key}.a${i + 1}`,
        })),
      }));
    },
    filteredCategories() {
      const term = this.search.trim().toLowerCase();
      if (term === "") return this.categories;
      return this.categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => {
            const q = this.renderText(item.q, category.key).toLowerCase();
            const a = this.renderText(item.a, category.key).toLowerCase();
            const title = this.$t(
              `faq.categories.${category.key}.title`
            ).toLowerCase();
            return (
              q.includes(term) || a.includes(term) || title.includes(term)
            );
          }),
        }))
        .filter((category) => category.items.length > 0);
    },
  },
  methods: {
    renderText(key) {
      return this.$t(key, { name: this.brandName });
    },
    escapeHtml(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
    // Answers may contain static, developer-authored <a> links to other
    // Biatec products/resources; escape the only dynamic part ({name})
    // before it is substituted into HTML rendered via v-html.
    renderHtml(key) {
      return this.$t(key, { name: this.escapeHtml(this.brandName) });
    },
  },
};
</script>

<style scoped>
.faq-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.faq-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0 0.5rem;
}

.faq-hero-icon {
  font-size: 2.25rem;
  color: var(--p-primary-color);
}

.faq-hero-title {
  margin: 0;
}

.faq-hero-subtitle {
  max-width: 46rem;
  color: var(--p-text-muted-color, var(--p-text-color-secondary));
  margin: 0;
}

.faq-search {
  width: 100%;
  max-width: 28rem;
  margin-top: 0.5rem;
}

.faq-category-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.faq-category-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--p-content-border-color);
  background: var(--p-content-background);
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.875rem;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.faq-category-chip:hover {
  border-color: var(--p-primary-color);
  color: var(--p-primary-color);
}

.faq-category-chip i {
  color: var(--p-primary-color);
}

.faq-no-results {
  text-align: center;
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.faq-no-results i {
  font-size: 2rem;
  color: var(--p-text-muted-color, var(--p-text-color-secondary));
  margin-bottom: 0.35rem;
}

.faq-category {
  scroll-margin-top: 5rem;
}

.faq-category-card :deep(.p-card-body) {
  padding: 0;
}

.faq-category-card :deep(.p-card-content) {
  padding-top: 0;
}

.faq-category-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1.25rem 0.5rem;
}

.faq-category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
  color: var(--p-primary-color);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.faq-category-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.faq-category-heading h2 {
  margin: 0;
  font-size: 1.15rem;
}

.faq-answer {
  white-space: pre-line;
  line-height: 1.6;
  margin: 0;
}

.faq-answer :deep(a) {
  color: var(--p-primary-color);
  font-weight: 600;
  text-decoration: underline;
}

.faq-footer-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  color: var(--p-text-muted-color, var(--p-text-color-secondary));
  font-size: 0.875rem;
  padding: 0.5rem 0 1rem;
}

@media (max-width: 40rem) {
  .faq-hero-title {
    font-size: 1.5rem;
  }
  .faq-category-header {
    padding: 1rem 1rem 0.35rem;
  }
  .faq-category-icon {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.05rem;
  }
}
</style>

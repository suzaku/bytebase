<template>
  <div
    ref="tableViewRef"
    class="relative flex flex-col justify-start items-start h-full p-2"
  >
    <div
      v-show="queryResult !== null"
      class="w-full flex flex-row justify-between items-center mb-2"
    >
      <div class="flex flex-row justify-start items-center mr-2">
        <NInput
          v-model:value="state.search"
          class="max-w-xs"
          type="text"
          :placeholder="t('sql-editor.search-results')"
        >
          <template #prefix>
            <heroicons-outline:search class="h-5 w-5 text-gray-300" />
          </template>
        </NInput>
        <span class="ml-2 whitespace-nowrap text-sm text-gray-500">{{
          `${data.length} ${t("sql-editor.rows", data.length)}`
        }}</span>
      </div>
      <div class="flex justify-between items-center">
        <NDropdown
          trigger="hover"
          :options="exportDropdownOptions"
          @select="handleExportBtnClick"
        >
          <NButton>
            <template #icon>
              <heroicons-outline:download class="h-5 w-5" />
            </template>
            {{ t("common.export") }}
          </NButton>
        </NDropdown>
      </div>
    </div>
    <NDataTable
      v-show="data.length > 0"
      size="small"
      :bordered="false"
      :columns="columns"
      :data="data"
    >
      <template #empty>
        <span>
          <!-- hide n-data-table default empty content -->
        </span>
      </template>
    </NDataTable>
    <div
      v-show="notifyMessage"
      class="absolute w-full h-full flex justify-center items-center transition-all bg-transparent"
      :class="notifyMessage ? 'bg-white bg-opacity-90' : ''"
    >
      {{ notifyMessage }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useNamespacedState } from "vuex-composition-helpers";

import { useI18n } from "vue-i18n";

interface State {
  search: string;
}

const { t } = useI18n();

const { queryResult, isExecuting } = useNamespacedState<{
  queryResult: Record<string, any>[] | null;
  isExecuting: boolean;
}>("sqlEditor", ["queryResult", "isExecuting"]);

const state = reactive<State>({
  search: "",
});

const tableViewRef = ref<HTMLDivElement>();
const tableMaxHeight = ref(0);

const columns = computed(() => {
  return queryResult.value && queryResult.value.length > 0
    ? Object.keys(queryResult.value[0]).map((item) => {
        return {
          title: item.toUpperCase(),
          key: item,
        };
      })
    : [];
});
const data = computed(() => {
  const temp =
    queryResult.value && queryResult.value.length > 0
      ? queryResult.value.filter((d) => {
          let t = false;

          for (const k in d) {
            if (String(d[k]).includes(state.search)) {
              t = true;
              break;
            }
          }

          return t;
        })
      : [];
  return temp;
});
const notifyMessage = computed(() => {
  if (queryResult.value === null) {
    return t("sql-editor.table-empty-placehoder");
  }
  if (isExecuting.value) {
    return t("sql-editor.loading-data");
  }
  if (queryResult.value.length === 0) {
    return t("sql-editor.no-rows-found");
  }

  return "";
});

const exportDropdownOptions = computed(() => [
  {
    label: t("sql-editor.download-as-csv"),
    key: "csv",
  },
  {
    label: t("sql-editor.download-as-json"),
    key: "json",
  },
]);

const handleExportBtnClick = (format: "csv" | "json") => {
  let rawText = "";

  if (format === "csv") {
    let CSVContent = "";
    CSVContent += columns.value.map((item) => String(item.key)).join(",");
    CSVContent += "\n";

    for (const d of data.value) {
      const temp: any[] = [];
      for (const k in d) {
        temp.push(d[k]);
      }
      CSVContent += temp.map((item) => String(item)).join(",");
      CSVContent += "\n";
    }

    rawText = CSVContent;
  } else {
    rawText = JSON.stringify(data.value);
  }

  const encodedUri = encodeURI(`data:text/${format};charset=utf-8,${rawText}`);
  const link = document.createElement("a");

  // TODO: file name should be the current query name
  link.download = `${Date.now()}.${format}`;
  link.href = encodedUri;
  link.click();
};

// make sure the table view is always full of the pane
useResizeObserver(tableViewRef, (entries) => {
  const entry = entries[0];
  const { height } = entry.contentRect;
  tableMaxHeight.value = height;
});
</script>

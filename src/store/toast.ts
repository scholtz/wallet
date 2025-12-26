import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

type ToastSeverity = "success" | "info" | "warn" | "error";

interface ToastAddOptions {
  severity: ToastSeverity;
  detail: string;
  life?: number;
  summary?: string;
}

/* eslint-disable no-unused-vars */
interface ToastInstance {
  $toast: {
    add(options: ToastAddOptions): void;
  };
}
/* eslint-enable no-unused-vars */

export interface ToastState {
  _vm: ToastInstance | null;
  lastError: string;
}

interface SetVmPayload {
  _vm: ToastInstance | null;
}

interface ToastPayloadObject {
  summary?: string;
  detail?: string;
}

export type ToastPayload = string | ToastPayloadObject;

const state = (): ToastState => ({
  _vm: null,
  lastError: "",
});

const normalizeMessage = (payload: ToastPayload): string => {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (payload.summary && payload.summary.length > 0) {
      return payload.summary;
    }
    if (payload.detail && payload.detail.length > 0) {
      return payload.detail;
    }
    return JSON.stringify(payload);
  }
  return String(payload ?? "");
};

const showToast = (
  vm: ToastInstance | null,
  options: ToastAddOptions
): void => {
  if (vm?.$toast) {
    vm.$toast.add(options);
  } else if (
    typeof window !== "undefined" &&
    typeof window.alert === "function"
  ) {
    window.alert(options.detail);
  } else {
    console.log(options.severity.toUpperCase(), options.detail);
  }
};

const mutations: MutationTree<ToastState> = {
  setVM(currentState, vm: ToastInstance | null) {
    currentState._vm = vm;
  },
  setLastError(currentState, lastError: string) {
    currentState.lastError = lastError;
  },
};

const actions: ActionTree<ToastState, RootState> = {
  setVM({ commit }, payload: SetVmPayload) {
    commit("setVM", payload._vm);
  },
  async openSuccess({ state }, payload: ToastPayload) {
    const detail = normalizeMessage(payload);
    showToast(state._vm, {
      severity: "success",
      detail,
      life: 3000,
    });
  },
  async openError({ commit, state }, payload: ToastPayload) {
    const detail = normalizeMessage(payload);
    console.error("Error:", payload);
    showToast(state._vm, {
      severity: "error",
      detail,
      life: 10000,
    });
    commit("setLastError", detail);
  },
  async resetError({ commit }) {
    commit("setLastError", "");
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

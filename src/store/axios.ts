import type { ActionContext, ActionTree } from "vuex";
import axios, { AxiosError } from "axios";
import type { RootState } from "./index";

export interface AxiosState {}

interface GetPayload {
  url: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  silent?: boolean;
}

interface DownloadPayload {
  url: string;
  params?: Record<string, any>;
  type?: "post" | "get";
  name: string;
}

interface PostPayload {
  url: string;
  params?: Record<string, any>;
  body?: FormData;
  config?: Record<string, unknown>;
}

interface ApiErrorData {
  errors?: Record<string, unknown>;
  detail?: string;
}

type DispatchFn = ActionContext<AxiosState, RootState>["dispatch"];

const state = (): AxiosState => ({});

const getLang = (): string | undefined => {
  switch (localStorage.getItem("lang")) {
    case "sk":
    case "cs":
    case "en":
    case "de":
      return localStorage.getItem("lang") || undefined;
    default:
      return undefined;
  }
};

const applyLanguageHeader = (): void => {
  const lang = getLang();
  if (lang && axios.defaults.headers.common["Accept-Language"] !== lang) {
    axios.defaults.headers.common["Accept-Language"] = lang;
  }
};

const notifyError = async (
  dispatch: DispatchFn,
  message: string
): Promise<void> => {
  await dispatch("toast/openError", message, {
    root: true,
  });
};

const processErrorResponse = async (
  dispatch: DispatchFn,
  error: AxiosError<ApiErrorData>,
  { silent }: { silent?: boolean }
): Promise<boolean> => {
  let shown = false;
  const response = error.response;

  if (response?.status === 401) {
    await notifyError(dispatch, "Session timeout - unauthenticated");
    shown = true;
    await dispatch(
      "user/Logout",
      {},
      {
        root: true,
      }
    );
  }

  const data = response?.data;
  if (data?.errors) {
    Object.values(data.errors).forEach((fieldErrors) => {
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach((err) => {
          if (typeof err === "string" && err) {
            shown = true;
            void notifyError(dispatch, err);
          }
        });
      } else if (
        fieldErrors &&
        typeof fieldErrors === "object" &&
        fieldErrors !== null
      ) {
        Object.values(fieldErrors).forEach((err) => {
          if (typeof err === "string" && err) {
            shown = true;
            void notifyError(dispatch, err);
          }
        });
      } else if (typeof fieldErrors === "string" && fieldErrors) {
        shown = true;
        void notifyError(dispatch, fieldErrors);
      }
    });
  } else if (data?.detail) {
    shown = true;
    await notifyError(dispatch, data.detail);
  }

  if (!shown && !silent) {
    await notifyError(dispatch, "Error occurred, please try again later");
    shown = true;
  }

  return shown;
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

const actions: ActionTree<AxiosState, RootState> = {
  async get({ dispatch }, { url, params, headers, silent }: GetPayload) {
    applyLanguageHeader();
    try {
      const response = await axios.get(url, { params, headers });
      if (response.status === 200) {
        return response.data;
      }
      if (response.status === 204) {
        return false;
      }
      if (!silent) {
        await notifyError(dispatch, "Error occurred, please try again later");
      }
    } catch (error) {
      await processErrorResponse(dispatch, error as AxiosError<ApiErrorData>, {
        silent,
      });
    }
    return undefined;
  },
  async download({ dispatch }, { url, params, type, name }: DownloadPayload) {
    applyLanguageHeader();
    const showSuccess = async () => {
      await dispatch(
        "snackbar/openSuccess",
        "Súbor na stiahnutie bol odoslaný do prehliadača",
        {
          root: true,
        }
      );
    };

    try {
      if (type === "post") {
        const formData = new FormData();
        if (params) {
          Object.keys(params).forEach((key) => {
            formData.append(key, params[key]);
          });
        }
        const response = await axios.post(url, formData, {
          responseType: "blob",
        });
        if (response.data) {
          const blob = new Blob([response.data]);
          const downloadElement = document.createElement("a");
          const href = window.URL.createObjectURL(blob);
          downloadElement.href = href;
          downloadElement.download = name;
          document.body.appendChild(downloadElement);
          downloadElement.click();
          document.body.removeChild(downloadElement);
          window.URL.revokeObjectURL(href);
          await showSuccess();
        }
        return response.data;
      }

      const requestParams: Record<string, unknown> = {
        ...(params ?? {}),
      };
      requestParams.responseType = "blob";
      const response = await axios.get(url, {
        params: requestParams,
        responseType: "blob",
      });
      if (response.data) {
        const blob = new Blob([response.data]);
        const downloadElement = document.createElement("a");
        const href = window.URL.createObjectURL(blob);
        downloadElement.href = href;
        downloadElement.download = name;
        document.body.appendChild(downloadElement);
        downloadElement.click();
        document.body.removeChild(downloadElement);
        window.URL.revokeObjectURL(href);
        await showSuccess();
      }
      return response.data;
    } catch (error) {
      await processErrorResponse(dispatch, error as AxiosError<ApiErrorData>, {
        silent: false,
      });
    }
    return undefined;
  },
  async post({ dispatch }, { url, params, body, config }: PostPayload) {
    applyLanguageHeader();
    try {
      let formData = new FormData();
      if (params) {
        Object.keys(params).forEach((key) => {
          formData.append(key, params[key]);
        });
      }
      if (body) {
        formData = body;
      }
      const response = await axios.post(url, formData, config);
      if (
        response.status === 200 &&
        (response.data || response.data === false || response.data === "")
      ) {
        return response.data;
      }
      if (response.status === 204) {
        return false;
      }
      await notifyError(dispatch, "Error occurred, please try again later");
    } catch (error) {
      await processErrorResponse(dispatch, error as AxiosError<ApiErrorData>, {
        silent: false,
      });
    }
    return undefined;
  },
};

export default {
  namespaced: true,
  state,
  actions,
};

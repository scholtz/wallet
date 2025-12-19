import { Buffer } from "buffer";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

export interface WalletConnectMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface ConfigState {
  debug: boolean;
  LOGO: string;
  env: string;
  envName: string;
  tokenSymbol: string;
  algod: string;
  participation: string;
  indexer: string;
  algodToken: string;
  participationToken: string;
  indexerToken: string;
  twoFactorServer: string;
  walletConnectProjectId: string;
  walletConnectMetadata: WalletConnectMetadata;
  languages: string[];
  noredirect: boolean;
  dev: boolean;
  deflex: string;
  language: string;
  theme: string;
}

export interface RemoteConfig
  extends Partial<Omit<ConfigState, "walletConnectMetadata">> {
  walletConnectMetadata?: Partial<WalletConnectMetadata>;
  d?: string;
  languages?: string[];
}

export interface SetHostsPayload {
  env?: string;
  envName?: string;
  tokenSymbol?: string;
  algod?: string;
  participation?: string;
  indexer?: string;
  algodToken?: string;
  participationToken?: string;
  indexerToken?: string;
}

const state = (): ConfigState => ({
  debug: false,
  LOGO: "/img/logo.svg",
  env: "mainnet-v1.0",
  envName: "Mainnet",
  tokenSymbol: "Algo",
  algod: "https://mainnet-api.algonode.cloud",
  participation: "",
  indexer: "https://mainnet-idx.algonode.cloud",
  algodToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  participationToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexerToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  twoFactorServer: "",
  walletConnectProjectId: "372941d972266817e1a8d1e403769ac0",
  walletConnectMetadata: {
    name: "AWallet",
    description: "Open source community algorand wallet",
    url: "www.a-wallet.net",
    icons: [],
  },
  languages: ["en", "hu", "it", "nl", "sk", "cs", "es", "tr"],
  noredirect: false,
  dev: false,
  deflex: "",
  language: "en-US",
  theme: "",
});

const methodsToDisable = ["log", "debug", "warn", "info"] as const;

const disableConsoleLogs = (): void => {
  if (!window.console) {
    (window as Window & { console: Console }).console = {} as Console;
  }
  /* eslint-disable no-unused-vars */
  const consoleAny = window.console as unknown as Record<
    string,
    (...args: unknown[]) => void
  >;
  /* eslint-enable no-unused-vars */
  methodsToDisable.forEach((method) => {
    consoleAny[method] = (...args: unknown[]) => {
      void args;
    };
  });
};

const mutations: MutationTree<ConfigState> = {
  setDev(currentState, value: boolean) {
    localStorage.setItem("dev", String(value));
    currentState.dev = value;
  },
  setTheme(currentState) {
    const value = localStorage.getItem("lastTheme");
    currentState.theme = value ?? currentState.theme;
  },
  setConfig(currentState, value: RemoteConfig) {
    const removeConsoleLogs = !value.debug;

    console.info("Welcome to AWallet");
    if (removeConsoleLogs) {
      console.info("Logs has been removed in production environment");
      disableConsoleLogs();
    }

    if (value.walletConnectProjectId) {
      currentState.walletConnectProjectId = value.walletConnectProjectId;
    }
    if (value.walletConnectMetadata) {
      currentState.walletConnectMetadata = {
        ...currentState.walletConnectMetadata,
        ...value.walletConnectMetadata,
      };
    }
    if (value.LOGO) {
      currentState.LOGO = value.LOGO;
    }
    if (value.algod) {
      currentState.algod = value.algod;
    }
    if (value.participation) {
      currentState.participation = value.participation;
    }
    if (value.languages) {
      currentState.languages = value.languages;
    }
    if (value.indexer) {
      currentState.indexer = value.indexer;
    }
    if (value.algodToken) {
      currentState.algodToken = value.algodToken;
    }
    if (value.participationToken) {
      currentState.participationToken = value.participationToken;
    }
    if (value.indexerToken) {
      currentState.indexerToken = value.indexerToken;
    }
    if (value.d) {
      currentState.deflex = Buffer.from(value.d, "hex").toString("utf8");
    }
    const dev = localStorage.getItem("dev");
    if (dev && dev !== "false") {
      currentState.dev = true;
    }
    const algodHost = localStorage.getItem("algodHost");
    if (algodHost) {
      currentState.algod = algodHost;
    }
    const env = localStorage.getItem("env");
    if (env) {
      currentState.env = env;
    }
    const envName = localStorage.getItem("envName");
    if (envName) {
      currentState.envName = envName;
    }

    const tokenSymbol = localStorage.getItem("tokenSymbol");
    if (tokenSymbol) {
      currentState.tokenSymbol = tokenSymbol;
    }

    const participationHost = localStorage.getItem("participationHost");
    if (participationHost) {
      currentState.participation = participationHost;
    }
    const indexerHost = localStorage.getItem("indexerHost");
    if (indexerHost) {
      currentState.indexer = indexerHost;
    }

    const algodToken = localStorage.getItem("algodToken");
    if (algodToken) {
      currentState.algodToken = algodToken;
    }
    const participationToken = localStorage.getItem("participationToken");
    if (participationToken) {
      currentState.participationToken = participationToken;
    }
    const indexerToken = localStorage.getItem("indexerToken");
    if (indexerToken) {
      currentState.indexerToken = indexerToken;
    }
  },
  setHosts(currentState, payload: SetHostsPayload) {
    const {
      env,
      envName,
      tokenSymbol,
      algod,
      participation,
      indexer,
      algodToken,
      participationToken,
      indexerToken,
    } = payload;
    if (env) {
      currentState.env = env;
      localStorage.setItem("env", env);
    }
    if (envName) {
      currentState.envName = envName;
      localStorage.setItem("envName", envName);
    }
    if (tokenSymbol) {
      currentState.tokenSymbol = tokenSymbol;
      localStorage.setItem("tokenSymbol", tokenSymbol);
    }
    if (algod) {
      currentState.algod = algod;
      localStorage.setItem("algodHost", algod);
    }
    if (participation) {
      currentState.participation = participation;
      localStorage.setItem("participationHost", participation);
    }
    if (indexer) {
      currentState.indexer = indexer;
      localStorage.setItem("indexerHost", indexer);
    }
    if (algodToken) {
      currentState.algodToken = algodToken;
      localStorage.setItem("algodToken", algodToken);
    }
    if (participationToken) {
      currentState.participationToken = participationToken;
      localStorage.setItem("participationToken", participationToken);
    }
    if (indexerToken) {
      currentState.indexerToken = indexerToken;
      localStorage.setItem("indexerToken", indexerToken);
    }
  },
  setLanguage(currentState, value: string) {
    currentState.language = value;
    localStorage.setItem("lang", value);
  },
  setNoRedirect(currentState) {
    currentState.noredirect = true;
  },
};

interface EnvPayload {
  env: string;
}

interface SetDevPayload {
  dev: boolean;
}

const actions: ActionTree<ConfigState, RootState> = {
  async setHosts(
    { commit, state },
    payload: SetHostsPayload & { env?: string }
  ) {
    let tokenSymbol = state.tokenSymbol;
    const { env } = payload;
    if (env === "mainnet" || env === "mainnet-v1.0") {
      tokenSymbol = "Algo";
    } else if (env === "aramidmain" || env === "aramidmain-v1.0") {
      tokenSymbol = "aAlgo";
    } else if (env === "voitestnet" || env === "voitest-v1") {
      tokenSymbol = "Voi";
    } else if (
      env === "voi" ||
      env === "voimain" ||
      env === "voi-v1.0" ||
      env === "voimain-v1.0"
    ) {
      tokenSymbol = "Voi";
    } else if (env === "testnet" || env === "testnet-v1.0") {
      tokenSymbol = "Algo";
    } else if (env === "devnet") {
      tokenSymbol = "Algo";
    } else if (env === "sandbox" || env === "sandnet-v1") {
      tokenSymbol = "Algo";
    }

    commit("setHosts", {
      ...payload,
      tokenSymbol,
    });
  },
  async setLanguage({ commit }, value: string) {
    commit("setLanguage", value);
  },
  async setEnv({ dispatch, state }, { env }: EnvPayload) {
    const currentEnv = state.env;
    if (env === "mainnet" || env === "mainnet-v1.0") {
      await dispatch("setHosts", {
        env: "mainnet",
        envName: "Mainnet",
        algod: "https://mainnet-api.algonode.cloud",
        participation: "https://kmd.h2.a-wallet.net",
        indexer: "https://mainnet-idx.algonode.cloud",
      });
    }

    if (currentEnv === "aramidmain" || env === "aramidmain-v1.0") {
      await dispatch("setHosts", {
        env: "aramidmain",
        envName: "Aramid Mainnet",
        algod: "https://algod.aramidmain.a-wallet.net",
        participation: "",
        indexer: "https://indexer.aramidmain.a-wallet.net",
        algodToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        participationToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexerToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    }

    if (currentEnv === "voitestnet" || env === "voitest-v1") {
      await dispatch("setHosts", {
        env: "voitestnet",
        envName: "Voi Testnet",
        algod: "https://testnet-api.voi.nodly.io/",
        participation: "",
        indexer: "https://testnet-idx.voi.nodly.io/",
      });
    }

    if (env === "testnet" || env === "testnet-v1.0") {
      await dispatch("setHosts", {
        env: "testnet",
        envName: "Testnet",
        algod: "https://testnet-api.algonode.cloud",
        participation: "",
        indexer: "https://testnet-idx.algonode.cloud",
      });
    }
    if (env === "devnet") {
      await dispatch("setHosts", {
        env: "devnet",
        envName: "Devnet",
        algod: "http://localhost:4180",
        participation: "",
        indexer: "http://localhost:8980",
        algodToken:
          "c87f5580d7a866317b4bfe9e8b8d1dda955636ccebfa88c12b414db208dd9705",
        indexerToken: "reach-devnet",
      });
    }
    if (env === "sandbox" || env === "sandnet-v1") {
      await dispatch("setHosts", {
        env: "sandbox",
        envName: "Sandbox",
        algod: "http://localhost:4001",
        participation: "",
        indexer: "http://localhost:8980",
        algodToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        participationToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexerToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    }
    localStorage.setItem("env", env);
  },
  async setNoRedirect({ commit }) {
    commit("setNoRedirect");
  },
  async setDev({ commit }, { dev }: SetDevPayload) {
    commit("setDev", dev);
  },
  async setTheme({ commit }) {
    commit("setTheme");
  },
  async getConfig({ dispatch, commit }) {
    try {
      const data = (await dispatch(
        "axios/get",
        {
          url: "/config.json",
          silent: true,
        },
        { root: true }
      )) as RemoteConfig | undefined;
      if (data) {
        commit("setConfig", data);
        return data;
      }
    } catch (error) {
      console.error(error);
    }
    return undefined;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

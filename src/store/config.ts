import { Buffer } from "buffer";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";
import type { GenesisNetwork, ProviderEntry } from "./publicData";

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
  multiaccountOps: boolean;
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
  multiaccountOps: false,
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
  setMultiaccountOps(currentState, value: boolean) {
    localStorage.setItem("multiaccountOps", String(value));
    currentState.multiaccountOps = value;
  },
  setTheme(currentState, value?: string) {
    let resolved = value ?? localStorage.getItem("lastTheme") ?? undefined;
    if (!resolved) {
      resolved =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    currentState.theme = resolved;
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
    const multiaccountOps = localStorage.getItem("multiaccountOps");
    if (multiaccountOps && multiaccountOps !== "false") {
      currentState.multiaccountOps = true;
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

interface NetworkPreset {
  aliases: string[];
  env: string;
  envName: string;
  algod: string;
  participation: string;
  indexer: string;
  algodToken?: string;
  participationToken?: string;
  indexerToken?: string;
}

// Predefined fallback endpoints, used when the public network/provider data
// (fetched from AlgorandPublicData) hasn't loaded yet or has no entry for a
// network. `env` here is the canonical network id — it must match the
// `network` field used by the public genesis list so that a network switch
// looks identical whether it was resolved from public data or from here.
const NETWORK_PRESETS: NetworkPreset[] = [
  {
    aliases: ["mainnet", "mainnet-v1.0"],
    env: "mainnet-v1.0",
    envName: "Mainnet",
    algod: "https://mainnet-api.4160.nodely.dev",
    participation: "https://kmd.h2.a-wallet.net",
    indexer: "https://mainnet-idx.4160.nodely.dev",
  },
  {
    aliases: ["aramidmain", "aramidmain-v1.0"],
    env: "aramidmain-v1.0",
    envName: "Aramid Mainnet",
    algod: "https://aramidmain-algod-public.de.nodes.biatec.io",
    participation: "https://aramidmain-participation-1.de.biatec.io",
    indexer: "https://aramid-indexer-public.de.nodes.biatec.io",
    algodToken:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    participationToken:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    indexerToken:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  {
    aliases: ["voi", "voimain", "voimain-v1", "voimain-v1.0"],
    env: "voimain-v1.0",
    envName: "Voi Mainnet",
    algod: "https://mainnet-api.voi.nodely.dev",
    participation: "https://voimain-participation-1.de.biatec.io",
    indexer: "https://mainnet-idx.voi.nodely.dev",
  },
  {
    aliases: ["testnet", "testnet-v1.0"],
    env: "testnet-v1.0",
    envName: "Testnet",
    algod: "https://testnet-idx.4160.nodely.dev",
    participation: "",
    indexer: "https://testnet-idx.4160.nodely.dev",
  },
  {
    aliases: ["devnet"],
    env: "devnet",
    envName: "Devnet",
    algod: "http://localhost:4180",
    participation: "",
    indexer: "http://localhost:8980",
    algodToken:
      "c87f5580d7a866317b4bfe9e8b8d1dda955636ccebfa88c12b414db208dd9705",
    indexerToken: "reach-devnet",
  },
  {
    aliases: ["sandbox", "sandnet-v1"],
    env: "sandnet-v1",
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
  },
];

const findPreset = (env: string): NetworkPreset | undefined =>
  NETWORK_PRESETS.find((preset) => preset.aliases.includes(env));

const firstAvailable = (list: ProviderEntry[]): ProviderEntry | undefined =>
  list.find((entry) => !entry.registrationRequired);

const actions: ActionTree<ConfigState, RootState> = {
  async setHosts(
    { commit, state },
    payload: SetHostsPayload & { env?: string },
  ) {
    let tokenSymbol = state.tokenSymbol;
    const { env } = payload;
    if (env === "mainnet" || env === "mainnet-v1.0") {
      tokenSymbol = "Algo";
    } else if (env === "aramidmain" || env === "aramidmain-v1.0") {
      tokenSymbol = "aAlgo";
    } else if (
      env === "voi" ||
      env === "voimain" ||
      env === "voimain-v1" ||
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
  // Resolves a network switch (from either the navbar quick-switch or the
  // Settings page) to concrete host/token values, always preferring the
  // first non-registration-required provider from the public network data
  // (scholtz/AlgorandPublicData) over the hardcoded NETWORK_PRESETS fallback.
  // `env` is normalized to the canonical genesis network id (e.g.
  // "mainnet-v1.0") so it's consistent everywhere env is used as a cache key
  // (wallet.ts per-network account data, the Settings network Select, etc.)
  // regardless of which alias was passed in.
  async setEnv({ dispatch }, { env }: EnvPayload) {
    const preset = findPreset(env);
    const canonicalEnv = preset?.env ?? env;

    let envName = preset?.envName ?? env;
    let algod = preset?.algod ?? "";
    let participation = preset?.participation ?? "";
    let indexer = preset?.indexer ?? "";
    let algodToken = preset?.algodToken;
    let participationToken = preset?.participationToken;
    let indexerToken = preset?.indexerToken;

    const genesisList = (await dispatch(
      "publicData/getGenesisList",
      undefined,
      {
        root: true,
      },
    )) as GenesisNetwork[];
    const genesisEntry = genesisList.find((n) => n.network === canonicalEnv);

    if (genesisEntry) {
      envName = String(genesisEntry.name ?? envName);

      const algodList = (await dispatch(
        "publicData/getAlgodList",
        { chainId: canonicalEnv },
        { root: true },
      )) as ProviderEntry[];
      const bestAlgod = firstAvailable(algodList);
      if (bestAlgod) {
        algod = String(bestAlgod.host ?? bestAlgod.algodHost ?? algod);
        if (bestAlgod.token) algodToken = String(bestAlgod.token);
      }

      const participationList = (await dispatch(
        "publicData/getParticipationList",
        { chainId: canonicalEnv },
        { root: true },
      )) as ProviderEntry[];
      const bestParticipation = firstAvailable(participationList);
      if (bestParticipation) {
        participation = String(
          bestParticipation.host ??
            bestParticipation.participationHost ??
            participation,
        );
        if (bestParticipation.token)
          participationToken = String(bestParticipation.token);
      }

      const indexerList = (await dispatch(
        "publicData/getIndexerList",
        { chainId: canonicalEnv },
        { root: true },
      )) as ProviderEntry[];
      const bestIndexer = firstAvailable(indexerList);
      if (bestIndexer) {
        indexer = String(
          bestIndexer.host ?? bestIndexer.indexerHost ?? indexer,
        );
        if (bestIndexer.token) indexerToken = String(bestIndexer.token);
      }
    }

    await dispatch("setHosts", {
      env: canonicalEnv,
      envName,
      algod,
      participation,
      indexer,
      algodToken,
      participationToken,
      indexerToken,
    });
  },
  async setNoRedirect({ commit }) {
    commit("setNoRedirect");
  },
  async setDev({ commit }, { dev }: SetDevPayload) {
    commit("setDev", dev);
  },
  async setMultiaccountOps({ commit }, value: boolean) {
    commit("setMultiaccountOps", value);
  },
  async setTheme({ commit }, value?: string) {
    if (value) {
      localStorage.setItem("lastTheme", value);
    }
    commit("setTheme", value);
  },
  async getConfig({ dispatch, commit }) {
    try {
      const data = (await dispatch(
        "axios/get",
        {
          url: "/config.json",
          silent: true,
        },
        { root: true },
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

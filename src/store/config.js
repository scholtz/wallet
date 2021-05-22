const state = () => ({
  LOGO: "",
});

const mutations = {
  setConfig(state, value) {
    if (value.LOGO) {
      state.LOGO = value.LOGO;
    }
  },
};
const actions = {
  async getConfig({ dispatch, commit }) {
    try {
      const data = await dispatch(
        "axios/get",
        {
          url: "./config.json",
        },
        { root: true }
      );
      if (data) {
        await commit("setConfig", data);
        await dispatch(
          "insurance/setCountry",
          { country: data.COUNTRY },
          {
            root: true,
          }
        );
        return data;
      }
    } catch (error) {
      dispatch("snackbar/openError", error.response, {
        root: true,
      });
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

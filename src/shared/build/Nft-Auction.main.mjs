// Automatically generated with Reach 0.1.2
/* eslint-disable */
export const _version = "0.1.2";

export function getExports(s) {
  const stdlib = s.reachStdlib;
  return {};
}

export function _getViews(s, viewlib) {
  const stdlib = s.reachStdlib;
  const ctc0 = stdlib.T_Address;

  return {
    infos: {
      NFT: {
        owner: {
          decode: async (i, svs, args) => {
            if (
              stdlib.eq(
                i,
                stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 1)
              )
            ) {
              const [v33] = svs;
              return await (async () => {
                return v33;
              })(...args);
            }
            if (
              stdlib.eq(
                i,
                stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 2)
              )
            ) {
              const [v33] = svs;
              return await (async () => {
                return v33;
              })(...args);
            }
            if (
              stdlib.eq(
                i,
                stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 3)
              )
            ) {
              const [v33] = svs;
              return await (async () => {
                return v33;
              })(...args);
            }
            if (
              stdlib.eq(
                i,
                stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 4)
              )
            ) {
              const [v33] = svs;
              return await (async () => {
                return v33;
              })(...args);
            }
            if (
              stdlib.eq(
                i,
                stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 5)
              )
            ) {
              const [v33] = svs;
              return await (async () => {
                return v33;
              })(...args);
            }

            stdlib.assert(false, "illegal view");
          },
          ty: ctc0,
        },
      },
    },
    views: {
      1: [ctc0],
      2: [ctc0],
      3: [ctc0],
      4: [ctc0],
      5: [ctc0],
    },
  };
}

export function _getMaps(s) {
  const stdlib = s.reachStdlib;
  const ctc0 = stdlib.T_Tuple([]);
  return {
    mapDataTy: ctc0,
  };
}

export async function Bidder(ctc, interact) {
  const stdlib = ctc.stdlib;
  const ctc0 = stdlib.T_UInt;
  const ctc1 = stdlib.T_Bytes(
    stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 150)
  );
  const ctc2 = stdlib.T_Address;
  const ctc3 = stdlib.T_Null;
  const ctc4 = stdlib.T_Tuple([ctc0, ctc2]);
  const ctc5 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc2, ctc0, ctc0]);
  const ctc6 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc2, ctc0]);
  const ctc7 = stdlib.T_Bool;
  const ctc8 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc7, ctc2, ctc2, ctc0, ctc0]);
  const ctc9 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc7, ctc2, ctc2, ctc0]);
  const ctc10 = stdlib.T_Tuple([]);
  const ctc11 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc0, ctc2, ctc0]);
  const ctc12 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc0, ctc2]);

  const v21 = await ctc.creationTime();
  const txn1 = await ctc.recv(1, 3, [ctc0, ctc0, ctc1], false, false);
  const [v26, v27, v28] = txn1.data;
  const v30 = txn1.time;
  const v25 = txn1.from;
  let v31 = false;
  let v32 = v25;
  let v33 = v25;
  let v34 = stdlib.checkedBigNumberify(
    "./Nft-Auction.rsh:39:61:decimal",
    stdlib.UInt_max,
    0
  );
  let v150 = v30;

  while (
    (() => {
      return true;
    })()
  ) {
    if (v31) {
      const v64 = ctc.selfAddress(
        "Bidder",
        true,
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:57:20:application",
          stdlib.UInt_max,
          63
        )
      );
      const v67 = stdlib.addressEq(v64, v32);
      const v69 = v67 ? false : true;
      const v73 = stdlib.addressEq(v64, v33);
      const v75 = v73 ? false : true;
      const v78 = v67 ? false : v75;
      let v80;
      if (v78) {
        const v79 = stdlib.protect(ctc0, await interact.getBid(v28), {
          at: "./Nft-Auction.rsh:58:93:application",
          fs: [
            "at ./Nft-Auction.rsh:57:20:application call to [unknown function] (defined at: ./Nft-Auction.rsh:57:24:function exp)",
          ],
          msg: "getBid",
          who: "Bidder",
        });
        v80 = v79;
      } else {
        v80 = v34;
      }
      const v94 = v78 ? v64 : v32;

      const v95 = stdlib.gt(v80, v34);
      const v97 = stdlib.addressEq(v33, v64);
      const v99 = v97 ? false : true;
      const v102 = v95 ? v99 : false;
      const v109 = v102 ? v69 : false;

      const txn2 = await ctc.sendrecv(
        4,
        2,
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:62:16:dot",
          stdlib.UInt_max,
          5
        ),
        [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0, ctc0, ctc2],
        [v25, v27, v32, v33, v34, v150, v80, v94],
        [
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:decimal",
            stdlib.UInt_max,
            0
          ),
          [],
        ],
        [ctc0, ctc2],
        v109,
        false,
        v27,
        async (txn2) => {
          const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

          sim_r.prevSt = stdlib.digest(ctc5, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:62:16:dot",
              stdlib.UInt_max,
              4
            ),
            v25,
            v27,
            v32,
            v33,
            v34,
            v150,
          ]);
          sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:62:16:dot",
              stdlib.UInt_max,
              4
            ),
            v25,
            v27,
            v32,
            v33,
            v34,
          ]);
          const [v111, v112] = txn2.data;
          const v114 = txn2.time;
          const v110 = txn2.from;

          sim_r.txns.push({
            amt: stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            kind: "to",
            tok: undefined,
          });
          sim_r.nextSt = stdlib.digest(ctc11, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
              stdlib.UInt_max,
              5
            ),
            v25,
            v27,
            v33,
            v111,
            v112,
            v114,
          ]);
          sim_r.nextSt_noTime = stdlib.digest(ctc12, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
              stdlib.UInt_max,
              5
            ),
            v25,
            v27,
            v33,
            v111,
            v112,
          ]);
          sim_r.view = [
            ctc4,
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
                stdlib.UInt_max,
                1
              ),
              v33,
            ],
          ];
          sim_r.isHalt = false;

          return sim_r;
        }
      );
      if (txn2.didTimeout) {
        const v128 = ctc.selfAddress(
          "Bidder",
          true,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:63:15:application",
            stdlib.UInt_max,
            127
          )
        );
        stdlib.protect(ctc3, await interact.seeOutcome(v28, v33), {
          at: "./Nft-Auction.rsh:64:32:application",
          fs: [
            "at ./Nft-Auction.rsh:63:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:63:38:function exp)",
          ],
          msg: "seeOutcome",
          who: "Bidder",
        });

        const v130 = stdlib.addressEq(v32, v128);

        const txn3 = await ctc.sendrecv(
          5,
          0,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:66:18:dot",
            stdlib.UInt_max,
            5
          ),
          [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0],
          [v25, v27, v32, v33, v34, v150],
          [v34, []],
          [],
          v130,
          false,
          stdlib.add(
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:66:62:decimal",
              stdlib.UInt_max,
              20
            ),
            v27
          ),
          async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

            sim_r.prevSt = stdlib.digest(ctc5, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:66:18:dot",
                stdlib.UInt_max,
                4
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
              v150,
            ]);
            sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:66:18:dot",
                stdlib.UInt_max,
                4
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
            ]);
            const [] = txn3.data;
            const v134 = txn3.time;
            const v131 = txn3.from;

            sim_r.txns.push({
              amt: v34,
              kind: "to",
              tok: undefined,
            });
            sim_r.txns.push({
              amt: v34,
              kind: "from",
              to: v33,
              tok: undefined,
            });
            const cv31 = false;
            const cv32 = v32;
            const cv33 = v32;
            const cv34 = stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:77:64:decimal",
              stdlib.UInt_max,
              0
            );
            const cv150 = v134;

            (() => {
              const v31 = cv31;
              const v32 = cv32;
              const v33 = cv33;
              const v34 = cv34;
              const v150 = cv150;

              if (
                (() => {
                  return true;
                })()
              ) {
                if (v31) {
                  sim_r.nextSt = stdlib.digest(ctc5, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        2
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                } else {
                  sim_r.nextSt = stdlib.digest(ctc8, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        5
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                }
              } else {
                sim_r.txns.push({
                  kind: "halt",
                  tok: undefined,
                });
                sim_r.nextSt = stdlib.digest(ctc10, []);
                sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                sim_r.view = [ctc10, []];
                sim_r.isHalt = true;
              }
            })();
            return sim_r;
          }
        );
        if (txn3.didTimeout) {
          stdlib.protect(ctc3, await interact.informTimeout(), {
            at: "./Nft-Auction.rsh:68:37:application",
            fs: [
              "at ./Nft-Auction.rsh:67:17:application call to [unknown function] (defined at: ./Nft-Auction.rsh:67:40:function exp)",
            ],
            msg: "informTimeout",
            who: "Bidder",
          });

          const txn4 = await ctc.sendrecv(
            6,
            0,
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:71:20:dot",
              stdlib.UInt_max,
              5
            ),
            [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0],
            [v25, v27, v32, v33, v34, v150],
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              [],
            ],
            [],
            true,
            false,
            false,
            async (txn4) => {
              const sim_r = {
                txns: [],
                mapRefs: [],
                mapsPrev: [],
                mapsNext: [],
              };

              sim_r.prevSt = stdlib.digest(ctc5, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:71:20:dot",
                  stdlib.UInt_max,
                  4
                ),
                v25,
                v27,
                v32,
                v33,
                v34,
                v150,
              ]);
              sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:71:20:dot",
                  stdlib.UInt_max,
                  4
                ),
                v25,
                v27,
                v32,
                v33,
                v34,
              ]);
              const [] = txn4.data;
              const v147 = txn4.time;
              const v145 = txn4.from;

              sim_r.txns.push({
                amt: stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:decimal",
                  stdlib.UInt_max,
                  0
                ),
                kind: "to",
                tok: undefined,
              });
              const cv31 = false;
              const cv32 = v25;
              const cv33 = v25;
              const cv34 = stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:72:63:decimal",
                stdlib.UInt_max,
                0
              );
              const cv150 = v147;

              (() => {
                const v31 = cv31;
                const v32 = cv32;
                const v33 = cv33;
                const v34 = cv34;
                const v150 = cv150;

                if (
                  (() => {
                    return true;
                  })()
                ) {
                  if (v31) {
                    sim_r.nextSt = stdlib.digest(ctc5, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          2
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  } else {
                    sim_r.nextSt = stdlib.digest(ctc8, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          5
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  }
                } else {
                  sim_r.txns.push({
                    kind: "halt",
                    tok: undefined,
                  });
                  sim_r.nextSt = stdlib.digest(ctc10, []);
                  sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                  sim_r.view = [ctc10, []];
                  sim_r.isHalt = true;
                }
              })();
              return sim_r;
            }
          );
          const [] = txn4.data;
          const v147 = txn4.time;
          const v145 = txn4.from;
          const cv31 = false;
          const cv32 = v25;
          const cv33 = v25;
          const cv34 = stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:72:63:decimal",
            stdlib.UInt_max,
            0
          );
          const cv150 = v147;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        } else {
          const [] = txn3.data;
          const v134 = txn3.time;
          const v131 = txn3.from;
          const cv31 = false;
          const cv32 = v32;
          const cv33 = v32;
          const cv34 = stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:77:64:decimal",
            stdlib.UInt_max,
            0
          );
          const cv150 = v134;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        }
      } else {
        const [v111, v112] = txn2.data;
        const v114 = txn2.time;
        const v110 = txn2.from;
        stdlib.protect(ctc3, await interact.showBid(v28, v111, v32), {
          at: "./Nft-Auction.rsh:84:27:application",
          fs: [
            "at ./Nft-Auction.rsh:83:13:application call to [unknown function] (defined at: ./Nft-Auction.rsh:83:36:function exp)",
          ],
          msg: "showBid",
          who: "Bidder",
        });

        const txn3 = await ctc.sendrecv(
          7,
          0,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:86:17:dot",
            stdlib.UInt_max,
            5
          ),
          [ctc2, ctc0, ctc2, ctc0, ctc2, ctc0],
          [v25, v27, v33, v111, v112, v114],
          [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            [],
          ],
          [],
          true,
          false,
          false,
          async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

            sim_r.prevSt = stdlib.digest(ctc11, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:86:17:dot",
                stdlib.UInt_max,
                5
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
              v114,
            ]);
            sim_r.prevSt_noPrevTime = stdlib.digest(ctc12, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:86:17:dot",
                stdlib.UInt_max,
                5
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
            ]);
            const [] = txn3.data;
            const v123 = txn3.time;
            const v121 = txn3.from;

            sim_r.txns.push({
              amt: stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              kind: "to",
              tok: undefined,
            });
            const cv31 = true;
            const cv32 = v112;
            const cv33 = v33;
            const cv34 = v111;
            const cv150 = v123;

            (() => {
              const v31 = cv31;
              const v32 = cv32;
              const v33 = cv33;
              const v34 = cv34;
              const v150 = cv150;

              if (
                (() => {
                  return true;
                })()
              ) {
                if (v31) {
                  sim_r.nextSt = stdlib.digest(ctc5, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        2
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                } else {
                  sim_r.nextSt = stdlib.digest(ctc8, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        5
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                }
              } else {
                sim_r.txns.push({
                  kind: "halt",
                  tok: undefined,
                });
                sim_r.nextSt = stdlib.digest(ctc10, []);
                sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                sim_r.view = [ctc10, []];
                sim_r.isHalt = true;
              }
            })();
            return sim_r;
          }
        );
        const [] = txn3.data;
        const v123 = txn3.time;
        const v121 = txn3.from;
        const cv31 = true;
        const cv32 = v112;
        const cv33 = v33;
        const cv34 = v111;
        const cv150 = v123;

        v31 = cv31;
        v32 = cv32;
        v33 = cv33;
        v34 = cv34;
        v150 = cv150;

        continue;
      }
    } else {
      const v49 = ctc.selfAddress(
        "Bidder",
        true,
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:46:15:application",
          stdlib.UInt_max,
          48
        )
      );
      const v51 = stdlib.addressEq(v49, v33);
      let v53;
      if (v51) {
        const v52 = stdlib.protect(ctc7, await interact.isAuctionOn(v28), {
          at: "./Nft-Auction.rsh:47:81:application",
          fs: [
            "at ./Nft-Auction.rsh:46:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:46:38:function exp)",
          ],
          msg: "isAuctionOn",
          who: "Bidder",
        });
        v53 = v52;
      } else {
        v53 = true;
      }

      const v54 = stdlib.addressEq(v33, v49);

      const txn2 = await ctc.sendrecv(
        8,
        1,
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:50:19:dot",
          stdlib.UInt_max,
          6
        ),
        [ctc2, ctc0, ctc7, ctc2, ctc2, ctc0, ctc0, ctc7],
        [v25, v27, v31, v32, v33, v34, v150, v53],
        [
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:decimal",
            stdlib.UInt_max,
            0
          ),
          [],
        ],
        [ctc7],
        v54,
        false,
        false,
        async (txn2) => {
          const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

          sim_r.prevSt = stdlib.digest(ctc8, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:50:19:dot",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
            v150,
          ]);
          sim_r.prevSt_noPrevTime = stdlib.digest(ctc9, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:50:19:dot",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
          ]);
          const [v57] = txn2.data;
          const v59 = txn2.time;
          const v56 = txn2.from;

          sim_r.txns.push({
            amt: stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            kind: "to",
            tok: undefined,
          });
          if (v57) {
            sim_r.nextSt = stdlib.digest(ctc5, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
              v59,
            ]);
            sim_r.nextSt_noTime = stdlib.digest(ctc6, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
            ]);
            sim_r.view = [
              ctc4,
              [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                  stdlib.UInt_max,
                  4
                ),
                v33,
              ],
            ];
            sim_r.isHalt = false;
          } else {
            const cv31 = v31;
            const cv32 = v32;
            const cv33 = v33;
            const cv34 = v34;
            const cv150 = v59;

            (() => {
              const v31 = cv31;
              const v32 = cv32;
              const v33 = cv33;
              const v34 = cv34;
              const v150 = cv150;

              if (
                (() => {
                  return true;
                })()
              ) {
                if (v31) {
                  sim_r.nextSt = stdlib.digest(ctc5, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        2
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                } else {
                  sim_r.nextSt = stdlib.digest(ctc8, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        5
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                }
              } else {
                sim_r.txns.push({
                  kind: "halt",
                  tok: undefined,
                });
                sim_r.nextSt = stdlib.digest(ctc10, []);
                sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                sim_r.view = [ctc10, []];
                sim_r.isHalt = true;
              }
            })();
          }
          return sim_r;
        }
      );
      const [v57] = txn2.data;
      const v59 = txn2.time;
      const v56 = txn2.from;
      if (v57) {
        const v64 = ctc.selfAddress(
          "Bidder",
          true,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:57:20:application",
            stdlib.UInt_max,
            63
          )
        );
        const v67 = stdlib.addressEq(v64, v32);
        const v69 = v67 ? false : true;
        const v73 = stdlib.addressEq(v64, v33);
        const v75 = v73 ? false : true;
        const v78 = v67 ? false : v75;
        let v80;
        if (v78) {
          const v79 = stdlib.protect(ctc0, await interact.getBid(v28), {
            at: "./Nft-Auction.rsh:58:93:application",
            fs: [
              "at ./Nft-Auction.rsh:57:20:application call to [unknown function] (defined at: ./Nft-Auction.rsh:57:24:function exp)",
            ],
            msg: "getBid",
            who: "Bidder",
          });
          v80 = v79;
        } else {
          v80 = v34;
        }
        const v94 = v78 ? v64 : v32;

        const v95 = stdlib.gt(v80, v34);
        const v97 = stdlib.addressEq(v33, v64);
        const v99 = v97 ? false : true;
        const v102 = v95 ? v99 : false;
        const v109 = v102 ? v69 : false;

        const txn3 = await ctc.sendrecv(
          9,
          2,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:62:16:dot",
            stdlib.UInt_max,
            5
          ),
          [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0, ctc0, ctc2],
          [v25, v27, v32, v33, v34, v59, v80, v94],
          [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            [],
          ],
          [ctc0, ctc2],
          v109,
          false,
          v27,
          async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

            sim_r.prevSt = stdlib.digest(ctc5, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:62:16:dot",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
              v59,
            ]);
            sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:62:16:dot",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
            ]);
            const [v111, v112] = txn3.data;
            const v114 = txn3.time;
            const v110 = txn3.from;

            sim_r.txns.push({
              amt: stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              kind: "to",
              tok: undefined,
            });
            sim_r.nextSt = stdlib.digest(ctc11, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
                stdlib.UInt_max,
                8
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
              v114,
            ]);
            sim_r.nextSt_noTime = stdlib.digest(ctc12, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
                stdlib.UInt_max,
                8
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
            ]);
            sim_r.view = [
              ctc4,
              [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:81:17:after expr stmt semicolon",
                  stdlib.UInt_max,
                  3
                ),
                v33,
              ],
            ];
            sim_r.isHalt = false;

            return sim_r;
          }
        );
        if (txn3.didTimeout) {
          const v128 = ctc.selfAddress(
            "Bidder",
            true,
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:63:15:application",
              stdlib.UInt_max,
              127
            )
          );
          stdlib.protect(ctc3, await interact.seeOutcome(v28, v33), {
            at: "./Nft-Auction.rsh:64:32:application",
            fs: [
              "at ./Nft-Auction.rsh:63:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:63:38:function exp)",
            ],
            msg: "seeOutcome",
            who: "Bidder",
          });

          const v130 = stdlib.addressEq(v32, v128);

          const txn4 = await ctc.sendrecv(
            10,
            0,
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:66:18:dot",
              stdlib.UInt_max,
              5
            ),
            [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0],
            [v25, v27, v32, v33, v34, v59],
            [v34, []],
            [],
            v130,
            false,
            stdlib.add(
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:66:62:decimal",
                stdlib.UInt_max,
                20
              ),
              v27
            ),
            async (txn4) => {
              const sim_r = {
                txns: [],
                mapRefs: [],
                mapsPrev: [],
                mapsNext: [],
              };

              sim_r.prevSt = stdlib.digest(ctc5, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:66:18:dot",
                  stdlib.UInt_max,
                  7
                ),
                v25,
                v27,
                v32,
                v33,
                v34,
                v59,
              ]);
              sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:66:18:dot",
                  stdlib.UInt_max,
                  7
                ),
                v25,
                v27,
                v32,
                v33,
                v34,
              ]);
              const [] = txn4.data;
              const v134 = txn4.time;
              const v131 = txn4.from;

              sim_r.txns.push({
                amt: v34,
                kind: "to",
                tok: undefined,
              });
              sim_r.txns.push({
                amt: v34,
                kind: "from",
                to: v33,
                tok: undefined,
              });
              const cv31 = false;
              const cv32 = v32;
              const cv33 = v32;
              const cv34 = stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:77:64:decimal",
                stdlib.UInt_max,
                0
              );
              const cv150 = v134;

              (() => {
                const v31 = cv31;
                const v32 = cv32;
                const v33 = cv33;
                const v34 = cv34;
                const v150 = cv150;

                if (
                  (() => {
                    return true;
                  })()
                ) {
                  if (v31) {
                    sim_r.nextSt = stdlib.digest(ctc5, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          2
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  } else {
                    sim_r.nextSt = stdlib.digest(ctc8, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          5
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  }
                } else {
                  sim_r.txns.push({
                    kind: "halt",
                    tok: undefined,
                  });
                  sim_r.nextSt = stdlib.digest(ctc10, []);
                  sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                  sim_r.view = [ctc10, []];
                  sim_r.isHalt = true;
                }
              })();
              return sim_r;
            }
          );
          if (txn4.didTimeout) {
            stdlib.protect(ctc3, await interact.informTimeout(), {
              at: "./Nft-Auction.rsh:68:37:application",
              fs: [
                "at ./Nft-Auction.rsh:67:17:application call to [unknown function] (defined at: ./Nft-Auction.rsh:67:40:function exp)",
              ],
              msg: "informTimeout",
              who: "Bidder",
            });

            const txn5 = await ctc.sendrecv(
              11,
              0,
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:71:20:dot",
                stdlib.UInt_max,
                5
              ),
              [ctc2, ctc0, ctc2, ctc2, ctc0, ctc0],
              [v25, v27, v32, v33, v34, v59],
              [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:decimal",
                  stdlib.UInt_max,
                  0
                ),
                [],
              ],
              [],
              true,
              false,
              false,
              async (txn5) => {
                const sim_r = {
                  txns: [],
                  mapRefs: [],
                  mapsPrev: [],
                  mapsNext: [],
                };

                sim_r.prevSt = stdlib.digest(ctc5, [
                  stdlib.checkedBigNumberify(
                    "./Nft-Auction.rsh:71:20:dot",
                    stdlib.UInt_max,
                    7
                  ),
                  v25,
                  v27,
                  v32,
                  v33,
                  v34,
                  v59,
                ]);
                sim_r.prevSt_noPrevTime = stdlib.digest(ctc6, [
                  stdlib.checkedBigNumberify(
                    "./Nft-Auction.rsh:71:20:dot",
                    stdlib.UInt_max,
                    7
                  ),
                  v25,
                  v27,
                  v32,
                  v33,
                  v34,
                ]);
                const [] = txn5.data;
                const v147 = txn5.time;
                const v145 = txn5.from;

                sim_r.txns.push({
                  amt: stdlib.checkedBigNumberify(
                    "./Nft-Auction.rsh:decimal",
                    stdlib.UInt_max,
                    0
                  ),
                  kind: "to",
                  tok: undefined,
                });
                const cv31 = false;
                const cv32 = v25;
                const cv33 = v25;
                const cv34 = stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:72:63:decimal",
                  stdlib.UInt_max,
                  0
                );
                const cv150 = v147;

                (() => {
                  const v31 = cv31;
                  const v32 = cv32;
                  const v33 = cv33;
                  const v34 = cv34;
                  const v150 = cv150;

                  if (
                    (() => {
                      return true;
                    })()
                  ) {
                    if (v31) {
                      sim_r.nextSt = stdlib.digest(ctc5, [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          4
                        ),
                        v25,
                        v27,
                        v32,
                        v33,
                        v34,
                        v150,
                      ]);
                      sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          4
                        ),
                        v25,
                        v27,
                        v32,
                        v33,
                        v34,
                      ]);
                      sim_r.view = [
                        ctc4,
                        [
                          stdlib.checkedBigNumberify(
                            "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                            stdlib.UInt_max,
                            2
                          ),
                          v33,
                        ],
                      ];
                      sim_r.isHalt = false;
                    } else {
                      sim_r.nextSt = stdlib.digest(ctc8, [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          6
                        ),
                        v25,
                        v27,
                        v31,
                        v32,
                        v33,
                        v34,
                        v150,
                      ]);
                      sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          6
                        ),
                        v25,
                        v27,
                        v31,
                        v32,
                        v33,
                        v34,
                      ]);
                      sim_r.view = [
                        ctc4,
                        [
                          stdlib.checkedBigNumberify(
                            "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                            stdlib.UInt_max,
                            5
                          ),
                          v33,
                        ],
                      ];
                      sim_r.isHalt = false;
                    }
                  } else {
                    sim_r.txns.push({
                      kind: "halt",
                      tok: undefined,
                    });
                    sim_r.nextSt = stdlib.digest(ctc10, []);
                    sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                    sim_r.view = [ctc10, []];
                    sim_r.isHalt = true;
                  }
                })();
                return sim_r;
              }
            );
            const [] = txn5.data;
            const v147 = txn5.time;
            const v145 = txn5.from;
            const cv31 = false;
            const cv32 = v25;
            const cv33 = v25;
            const cv34 = stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:72:63:decimal",
              stdlib.UInt_max,
              0
            );
            const cv150 = v147;

            v31 = cv31;
            v32 = cv32;
            v33 = cv33;
            v34 = cv34;
            v150 = cv150;

            continue;
          } else {
            const [] = txn4.data;
            const v134 = txn4.time;
            const v131 = txn4.from;
            const cv31 = false;
            const cv32 = v32;
            const cv33 = v32;
            const cv34 = stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:77:64:decimal",
              stdlib.UInt_max,
              0
            );
            const cv150 = v134;

            v31 = cv31;
            v32 = cv32;
            v33 = cv33;
            v34 = cv34;
            v150 = cv150;

            continue;
          }
        } else {
          const [v111, v112] = txn3.data;
          const v114 = txn3.time;
          const v110 = txn3.from;
          stdlib.protect(ctc3, await interact.showBid(v28, v111, v32), {
            at: "./Nft-Auction.rsh:84:27:application",
            fs: [
              "at ./Nft-Auction.rsh:83:13:application call to [unknown function] (defined at: ./Nft-Auction.rsh:83:36:function exp)",
            ],
            msg: "showBid",
            who: "Bidder",
          });

          const txn4 = await ctc.sendrecv(
            12,
            0,
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:86:17:dot",
              stdlib.UInt_max,
              5
            ),
            [ctc2, ctc0, ctc2, ctc0, ctc2, ctc0],
            [v25, v27, v33, v111, v112, v114],
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              [],
            ],
            [],
            true,
            false,
            false,
            async (txn4) => {
              const sim_r = {
                txns: [],
                mapRefs: [],
                mapsPrev: [],
                mapsNext: [],
              };

              sim_r.prevSt = stdlib.digest(ctc11, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:86:17:dot",
                  stdlib.UInt_max,
                  8
                ),
                v25,
                v27,
                v33,
                v111,
                v112,
                v114,
              ]);
              sim_r.prevSt_noPrevTime = stdlib.digest(ctc12, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:86:17:dot",
                  stdlib.UInt_max,
                  8
                ),
                v25,
                v27,
                v33,
                v111,
                v112,
              ]);
              const [] = txn4.data;
              const v123 = txn4.time;
              const v121 = txn4.from;

              sim_r.txns.push({
                amt: stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:decimal",
                  stdlib.UInt_max,
                  0
                ),
                kind: "to",
                tok: undefined,
              });
              const cv31 = true;
              const cv32 = v112;
              const cv33 = v33;
              const cv34 = v111;
              const cv150 = v123;

              (() => {
                const v31 = cv31;
                const v32 = cv32;
                const v33 = cv33;
                const v34 = cv34;
                const v150 = cv150;

                if (
                  (() => {
                    return true;
                  })()
                ) {
                  if (v31) {
                    sim_r.nextSt = stdlib.digest(ctc5, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          2
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  } else {
                    sim_r.nextSt = stdlib.digest(ctc8, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          5
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  }
                } else {
                  sim_r.txns.push({
                    kind: "halt",
                    tok: undefined,
                  });
                  sim_r.nextSt = stdlib.digest(ctc10, []);
                  sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                  sim_r.view = [ctc10, []];
                  sim_r.isHalt = true;
                }
              })();
              return sim_r;
            }
          );
          const [] = txn4.data;
          const v123 = txn4.time;
          const v121 = txn4.from;
          const cv31 = true;
          const cv32 = v112;
          const cv33 = v33;
          const cv34 = v111;
          const cv150 = v123;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        }
      } else {
        const cv31 = v31;
        const cv32 = v32;
        const cv33 = v33;
        const cv34 = v34;
        const cv150 = v59;

        v31 = cv31;
        v32 = cv32;
        v33 = cv33;
        v34 = cv34;
        v150 = cv150;

        continue;
      }
    }
  }
  return;
}
export async function Creator(ctc, interact) {
  const stdlib = ctc.stdlib;
  const ctc0 = stdlib.T_UInt;
  const ctc1 = stdlib.T_Bytes(
    stdlib.checkedBigNumberify("<builtin>", stdlib.UInt_max, 150)
  );
  const ctc2 = stdlib.T_Address;
  const ctc3 = stdlib.T_Null;
  const ctc4 = stdlib.T_Tuple([ctc0, ctc2]);
  const ctc5 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc2, ctc0, ctc0]);
  const ctc6 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc2, ctc0]);
  const ctc7 = stdlib.T_Bool;
  const ctc8 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc7, ctc2, ctc2, ctc0, ctc0]);
  const ctc9 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc7, ctc2, ctc2, ctc0]);
  const ctc10 = stdlib.T_Tuple([]);
  const ctc11 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc0, ctc2, ctc0]);
  const ctc12 = stdlib.T_Tuple([ctc0, ctc2, ctc0, ctc2, ctc0, ctc2]);
  const ctc13 = stdlib.T_Tuple([ctc0, ctc0]);
  const ctc14 = stdlib.T_Tuple([ctc0]);

  const v21 = await ctc.creationTime();
  const v18 = stdlib.protect(
    ctc0,
    interact.deadline,
    "for Creator's interact field deadline"
  );
  const v19 = stdlib.protect(
    ctc0,
    interact.getId,
    "for Creator's interact field getId"
  );
  const v20 = stdlib.protect(
    ctc1,
    interact.nftViewAddress,
    "for Creator's interact field nftViewAddress"
  );

  const txn1 = await ctc.sendrecv(
    1,
    3,
    stdlib.checkedBigNumberify(
      "./Nft-Auction.rsh:37:15:dot",
      stdlib.UInt_max,
      0
    ),
    [ctc0, ctc0, ctc0, ctc1],
    [v21, v19, v18, v20],
    [
      stdlib.checkedBigNumberify(
        "./Nft-Auction.rsh:decimal",
        stdlib.UInt_max,
        0
      ),
      [],
    ],
    [ctc0, ctc0, ctc1],
    true,
    true,
    false,
    async (txn1) => {
      const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

      sim_r.prevSt = stdlib.digest(ctc13, [
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:37:15:dot",
          stdlib.UInt_max,
          0
        ),
        v21,
      ]);
      sim_r.prevSt_noPrevTime = stdlib.digest(ctc14, [
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:37:15:dot",
          stdlib.UInt_max,
          0
        ),
      ]);
      const [v26, v27, v28] = txn1.data;
      const v30 = txn1.time;
      const v25 = txn1.from;

      sim_r.txns.push({
        amt: stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:decimal",
          stdlib.UInt_max,
          0
        ),
        kind: "to",
        tok: undefined,
      });
      const v31 = false;
      const v32 = v25;
      const v33 = v25;
      const v34 = stdlib.checkedBigNumberify(
        "./Nft-Auction.rsh:39:61:decimal",
        stdlib.UInt_max,
        0
      );
      const v150 = v30;

      if (
        (() => {
          return true;
        })()
      ) {
        if (v31) {
          sim_r.nextSt = stdlib.digest(ctc5, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
              stdlib.UInt_max,
              4
            ),
            v25,
            v27,
            v32,
            v33,
            v34,
            v150,
          ]);
          sim_r.nextSt_noTime = stdlib.digest(ctc6, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
              stdlib.UInt_max,
              4
            ),
            v25,
            v27,
            v32,
            v33,
            v34,
          ]);
          sim_r.view = [
            ctc4,
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                stdlib.UInt_max,
                2
              ),
              v33,
            ],
          ];
          sim_r.isHalt = false;
        } else {
          sim_r.nextSt = stdlib.digest(ctc8, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
            v150,
          ]);
          sim_r.nextSt_noTime = stdlib.digest(ctc9, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
          ]);
          sim_r.view = [
            ctc4,
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                stdlib.UInt_max,
                5
              ),
              v33,
            ],
          ];
          sim_r.isHalt = false;
        }
      } else {
        sim_r.txns.push({
          kind: "halt",
          tok: undefined,
        });
        sim_r.nextSt = stdlib.digest(ctc10, []);
        sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
        sim_r.view = [ctc10, []];
        sim_r.isHalt = true;
      }
      return sim_r;
    }
  );
  const [v26, v27, v28] = txn1.data;
  const v30 = txn1.time;
  const v25 = txn1.from;
  let v31 = false;
  let v32 = v25;
  let v33 = v25;
  let v34 = stdlib.checkedBigNumberify(
    "./Nft-Auction.rsh:39:61:decimal",
    stdlib.UInt_max,
    0
  );
  let v150 = v30;

  while (
    (() => {
      return true;
    })()
  ) {
    if (v31) {
      const txn2 = await ctc.recv(4, 2, [ctc0, ctc2], false, v27);
      if (txn2.didTimeout) {
        stdlib.protect(ctc3, await interact.seeOutcome(v28, v33), {
          at: "./Nft-Auction.rsh:64:32:application",
          fs: [
            "at ./Nft-Auction.rsh:63:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:63:38:function exp)",
          ],
          msg: "seeOutcome",
          who: "Creator",
        });

        const txn3 = await ctc.recv(
          5,
          0,
          [],
          false,
          stdlib.add(
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:66:62:decimal",
              stdlib.UInt_max,
              20
            ),
            v27
          )
        );
        if (txn3.didTimeout) {
          stdlib.protect(ctc3, await interact.informTimeout(), {
            at: "./Nft-Auction.rsh:68:37:application",
            fs: [
              "at ./Nft-Auction.rsh:67:17:application call to [unknown function] (defined at: ./Nft-Auction.rsh:67:40:function exp)",
            ],
            msg: "informTimeout",
            who: "Creator",
          });

          const txn4 = await ctc.recv(6, 0, [], false, false);
          const [] = txn4.data;
          const v147 = txn4.time;
          const v145 = txn4.from;
          const cv31 = false;
          const cv32 = v25;
          const cv33 = v25;
          const cv34 = stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:72:63:decimal",
            stdlib.UInt_max,
            0
          );
          const cv150 = v147;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        } else {
          const [] = txn3.data;
          const v134 = txn3.time;
          const v131 = txn3.from;
          const cv31 = false;
          const cv32 = v32;
          const cv33 = v32;
          const cv34 = stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:77:64:decimal",
            stdlib.UInt_max,
            0
          );
          const cv150 = v134;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        }
      } else {
        const [v111, v112] = txn2.data;
        const v114 = txn2.time;
        const v110 = txn2.from;
        stdlib.protect(ctc3, await interact.showBid(v28, v111, v32), {
          at: "./Nft-Auction.rsh:84:27:application",
          fs: [
            "at ./Nft-Auction.rsh:83:13:application call to [unknown function] (defined at: ./Nft-Auction.rsh:83:36:function exp)",
          ],
          msg: "showBid",
          who: "Creator",
        });

        const txn3 = await ctc.sendrecv(
          7,
          0,
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:86:17:dot",
            stdlib.UInt_max,
            5
          ),
          [ctc2, ctc0, ctc2, ctc0, ctc2, ctc0],
          [v25, v27, v33, v111, v112, v114],
          [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            [],
          ],
          [],
          true,
          false,
          false,
          async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

            sim_r.prevSt = stdlib.digest(ctc11, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:86:17:dot",
                stdlib.UInt_max,
                5
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
              v114,
            ]);
            sim_r.prevSt_noPrevTime = stdlib.digest(ctc12, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:86:17:dot",
                stdlib.UInt_max,
                5
              ),
              v25,
              v27,
              v33,
              v111,
              v112,
            ]);
            const [] = txn3.data;
            const v123 = txn3.time;
            const v121 = txn3.from;

            sim_r.txns.push({
              amt: stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              kind: "to",
              tok: undefined,
            });
            const cv31 = true;
            const cv32 = v112;
            const cv33 = v33;
            const cv34 = v111;
            const cv150 = v123;

            (() => {
              const v31 = cv31;
              const v32 = cv32;
              const v33 = cv33;
              const v34 = cv34;
              const v150 = cv150;

              if (
                (() => {
                  return true;
                })()
              ) {
                if (v31) {
                  sim_r.nextSt = stdlib.digest(ctc5, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        2
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                } else {
                  sim_r.nextSt = stdlib.digest(ctc8, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        5
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                }
              } else {
                sim_r.txns.push({
                  kind: "halt",
                  tok: undefined,
                });
                sim_r.nextSt = stdlib.digest(ctc10, []);
                sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                sim_r.view = [ctc10, []];
                sim_r.isHalt = true;
              }
            })();
            return sim_r;
          }
        );
        const [] = txn3.data;
        const v123 = txn3.time;
        const v121 = txn3.from;
        const cv31 = true;
        const cv32 = v112;
        const cv33 = v33;
        const cv34 = v111;
        const cv150 = v123;

        v31 = cv31;
        v32 = cv32;
        v33 = cv33;
        v34 = cv34;
        v150 = cv150;

        continue;
      }
    } else {
      const v45 = stdlib.addressEq(v25, v33);
      let v47;
      if (v45) {
        const v46 = stdlib.protect(ctc7, await interact.isAuctionOn(v28), {
          at: "./Nft-Auction.rsh:47:81:application",
          fs: [
            "at ./Nft-Auction.rsh:46:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:46:38:function exp)",
          ],
          msg: "isAuctionOn",
          who: "Creator",
        });
        v47 = v46;
      } else {
        v47 = true;
      }

      const v55 = stdlib.addressEq(v33, v25);

      const txn2 = await ctc.sendrecv(
        8,
        1,
        stdlib.checkedBigNumberify(
          "./Nft-Auction.rsh:50:19:dot",
          stdlib.UInt_max,
          6
        ),
        [ctc2, ctc0, ctc7, ctc2, ctc2, ctc0, ctc0, ctc7],
        [v25, v27, v31, v32, v33, v34, v150, v47],
        [
          stdlib.checkedBigNumberify(
            "./Nft-Auction.rsh:decimal",
            stdlib.UInt_max,
            0
          ),
          [],
        ],
        [ctc7],
        v55,
        false,
        false,
        async (txn2) => {
          const sim_r = { txns: [], mapRefs: [], mapsPrev: [], mapsNext: [] };

          sim_r.prevSt = stdlib.digest(ctc8, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:50:19:dot",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
            v150,
          ]);
          sim_r.prevSt_noPrevTime = stdlib.digest(ctc9, [
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:50:19:dot",
              stdlib.UInt_max,
              6
            ),
            v25,
            v27,
            v31,
            v32,
            v33,
            v34,
          ]);
          const [v57] = txn2.data;
          const v59 = txn2.time;
          const v56 = txn2.from;

          sim_r.txns.push({
            amt: stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:decimal",
              stdlib.UInt_max,
              0
            ),
            kind: "to",
            tok: undefined,
          });
          if (v57) {
            sim_r.nextSt = stdlib.digest(ctc5, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
              v59,
            ]);
            sim_r.nextSt_noTime = stdlib.digest(ctc6, [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                stdlib.UInt_max,
                7
              ),
              v25,
              v27,
              v32,
              v33,
              v34,
            ]);
            sim_r.view = [
              ctc4,
              [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                  stdlib.UInt_max,
                  4
                ),
                v33,
              ],
            ];
            sim_r.isHalt = false;
          } else {
            const cv31 = v31;
            const cv32 = v32;
            const cv33 = v33;
            const cv34 = v34;
            const cv150 = v59;

            (() => {
              const v31 = cv31;
              const v32 = cv32;
              const v33 = cv33;
              const v34 = cv34;
              const v150 = cv150;

              if (
                (() => {
                  return true;
                })()
              ) {
                if (v31) {
                  sim_r.nextSt = stdlib.digest(ctc5, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                      stdlib.UInt_max,
                      4
                    ),
                    v25,
                    v27,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        2
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                } else {
                  sim_r.nextSt = stdlib.digest(ctc8, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                    v150,
                  ]);
                  sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                    stdlib.checkedBigNumberify(
                      "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                      stdlib.UInt_max,
                      6
                    ),
                    v25,
                    v27,
                    v31,
                    v32,
                    v33,
                    v34,
                  ]);
                  sim_r.view = [
                    ctc4,
                    [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        5
                      ),
                      v33,
                    ],
                  ];
                  sim_r.isHalt = false;
                }
              } else {
                sim_r.txns.push({
                  kind: "halt",
                  tok: undefined,
                });
                sim_r.nextSt = stdlib.digest(ctc10, []);
                sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                sim_r.view = [ctc10, []];
                sim_r.isHalt = true;
              }
            })();
          }
          return sim_r;
        }
      );
      const [v57] = txn2.data;
      const v59 = txn2.time;
      const v56 = txn2.from;
      if (v57) {
        const txn3 = await ctc.recv(9, 2, [ctc0, ctc2], false, v27);
        if (txn3.didTimeout) {
          stdlib.protect(ctc3, await interact.seeOutcome(v28, v33), {
            at: "./Nft-Auction.rsh:64:32:application",
            fs: [
              "at ./Nft-Auction.rsh:63:15:application call to [unknown function] (defined at: ./Nft-Auction.rsh:63:38:function exp)",
            ],
            msg: "seeOutcome",
            who: "Creator",
          });

          const txn4 = await ctc.recv(
            10,
            0,
            [],
            false,
            stdlib.add(
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:66:62:decimal",
                stdlib.UInt_max,
                20
              ),
              v27
            )
          );
          if (txn4.didTimeout) {
            stdlib.protect(ctc3, await interact.informTimeout(), {
              at: "./Nft-Auction.rsh:68:37:application",
              fs: [
                "at ./Nft-Auction.rsh:67:17:application call to [unknown function] (defined at: ./Nft-Auction.rsh:67:40:function exp)",
              ],
              msg: "informTimeout",
              who: "Creator",
            });

            const txn5 = await ctc.recv(11, 0, [], false, false);
            const [] = txn5.data;
            const v147 = txn5.time;
            const v145 = txn5.from;
            const cv31 = false;
            const cv32 = v25;
            const cv33 = v25;
            const cv34 = stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:72:63:decimal",
              stdlib.UInt_max,
              0
            );
            const cv150 = v147;

            v31 = cv31;
            v32 = cv32;
            v33 = cv33;
            v34 = cv34;
            v150 = cv150;

            continue;
          } else {
            const [] = txn4.data;
            const v134 = txn4.time;
            const v131 = txn4.from;
            const cv31 = false;
            const cv32 = v32;
            const cv33 = v32;
            const cv34 = stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:77:64:decimal",
              stdlib.UInt_max,
              0
            );
            const cv150 = v134;

            v31 = cv31;
            v32 = cv32;
            v33 = cv33;
            v34 = cv34;
            v150 = cv150;

            continue;
          }
        } else {
          const [v111, v112] = txn3.data;
          const v114 = txn3.time;
          const v110 = txn3.from;
          stdlib.protect(ctc3, await interact.showBid(v28, v111, v32), {
            at: "./Nft-Auction.rsh:84:27:application",
            fs: [
              "at ./Nft-Auction.rsh:83:13:application call to [unknown function] (defined at: ./Nft-Auction.rsh:83:36:function exp)",
            ],
            msg: "showBid",
            who: "Creator",
          });

          const txn4 = await ctc.sendrecv(
            12,
            0,
            stdlib.checkedBigNumberify(
              "./Nft-Auction.rsh:86:17:dot",
              stdlib.UInt_max,
              5
            ),
            [ctc2, ctc0, ctc2, ctc0, ctc2, ctc0],
            [v25, v27, v33, v111, v112, v114],
            [
              stdlib.checkedBigNumberify(
                "./Nft-Auction.rsh:decimal",
                stdlib.UInt_max,
                0
              ),
              [],
            ],
            [],
            true,
            false,
            false,
            async (txn4) => {
              const sim_r = {
                txns: [],
                mapRefs: [],
                mapsPrev: [],
                mapsNext: [],
              };

              sim_r.prevSt = stdlib.digest(ctc11, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:86:17:dot",
                  stdlib.UInt_max,
                  8
                ),
                v25,
                v27,
                v33,
                v111,
                v112,
                v114,
              ]);
              sim_r.prevSt_noPrevTime = stdlib.digest(ctc12, [
                stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:86:17:dot",
                  stdlib.UInt_max,
                  8
                ),
                v25,
                v27,
                v33,
                v111,
                v112,
              ]);
              const [] = txn4.data;
              const v123 = txn4.time;
              const v121 = txn4.from;

              sim_r.txns.push({
                amt: stdlib.checkedBigNumberify(
                  "./Nft-Auction.rsh:decimal",
                  stdlib.UInt_max,
                  0
                ),
                kind: "to",
                tok: undefined,
              });
              const cv31 = true;
              const cv32 = v112;
              const cv33 = v33;
              const cv34 = v111;
              const cv150 = v123;

              (() => {
                const v31 = cv31;
                const v32 = cv32;
                const v33 = cv33;
                const v34 = cv34;
                const v150 = cv150;

                if (
                  (() => {
                    return true;
                  })()
                ) {
                  if (v31) {
                    sim_r.nextSt = stdlib.digest(ctc5, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc6, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                        stdlib.UInt_max,
                        4
                      ),
                      v25,
                      v27,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:56:17:after expr stmt semicolon",
                          stdlib.UInt_max,
                          2
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  } else {
                    sim_r.nextSt = stdlib.digest(ctc8, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                      v150,
                    ]);
                    sim_r.nextSt_noTime = stdlib.digest(ctc9, [
                      stdlib.checkedBigNumberify(
                        "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                        stdlib.UInt_max,
                        6
                      ),
                      v25,
                      v27,
                      v31,
                      v32,
                      v33,
                      v34,
                    ]);
                    sim_r.view = [
                      ctc4,
                      [
                        stdlib.checkedBigNumberify(
                          "./Nft-Auction.rsh:44:19:after expr stmt semicolon",
                          stdlib.UInt_max,
                          5
                        ),
                        v33,
                      ],
                    ];
                    sim_r.isHalt = false;
                  }
                } else {
                  sim_r.txns.push({
                    kind: "halt",
                    tok: undefined,
                  });
                  sim_r.nextSt = stdlib.digest(ctc10, []);
                  sim_r.nextSt_noTime = stdlib.digest(ctc10, []);
                  sim_r.view = [ctc10, []];
                  sim_r.isHalt = true;
                }
              })();
              return sim_r;
            }
          );
          const [] = txn4.data;
          const v123 = txn4.time;
          const v121 = txn4.from;
          const cv31 = true;
          const cv32 = v112;
          const cv33 = v33;
          const cv34 = v111;
          const cv150 = v123;

          v31 = cv31;
          v32 = cv32;
          v33 = cv33;
          v34 = cv34;
          v150 = cv150;

          continue;
        }
      } else {
        const cv31 = v31;
        const cv32 = v32;
        const cv33 = v33;
        const cv34 = v34;
        const cv150 = v59;

        v31 = cv31;
        v32 = cv32;
        v33 = cv33;
        v34 = cv34;
        v150 = cv150;

        continue;
      }
    }
  }
  return;
}

const _ALGO = {
  appApproval: `#pragma version 3
txn RekeyTo
global ZeroAddress
==
assert
txn OnCompletion
int OptIn
==
bz normal
global GroupSize
int 1
==
assert
b done
normal:
gtxna 0 ApplicationArgs 8
store 5
// Check that everyone's here
global GroupSize
int 3
>=
assert
// Check txnAppl (us)
txn GroupIndex
int 0
==
assert
// Check txnFromHandler
int 0
gtxn 2 Sender
byte "{{m1}}"
==
||
gtxn 2 Sender
byte "{{m4}}"
==
||
gtxn 2 Sender
byte "{{m5}}"
==
||
gtxn 2 Sender
byte "{{m6}}"
==
||
gtxn 2 Sender
byte "{{m7}}"
==
||
gtxn 2 Sender
byte "{{m8}}"
==
||
gtxn 2 Sender
byte "{{m9}}"
==
||
gtxn 2 Sender
byte "{{m10}}"
==
||
gtxn 2 Sender
byte "{{m11}}"
==
||
gtxn 2 Sender
byte "{{m12}}"
==
||
assert
byte base64(cw==)
app_global_get
gtxna 0 ApplicationArgs 0
==
assert
byte base64(cw==)
gtxna 0 ApplicationArgs 1
app_global_put
byte base64(bA==)
app_global_get
gtxna 0 ApplicationArgs 5
btoi
==
assert
byte base64(bA==)
global Round
app_global_put
int 0
txn NumAccounts
==
assert
byte base64(djA=)
gtxna 0 ApplicationArgs 2
substring 0 40
app_global_put
byte base64(aA==)
gtxna 0 ApplicationArgs 3
btoi
app_global_put
byte base64(aA==)
app_global_get
bnz halted
txn OnCompletion
int NoOp
==
assert
b done
halted:
txn OnCompletion
int DeleteApplication
==
assert
done:
int 1
return
`,
  appApproval0: `#pragma version 3
// Check that we're an App
txn TypeEnum
int appl
==
assert
txn RekeyTo
global ZeroAddress
==
assert
txn Sender
byte "{{Deployer}}"
==
assert
txn ApplicationID
bz init
global GroupSize
int 2
==
assert
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Amount
int 100000
==
assert
// We don't check the receiver, because we don't know it yet, because the escrow account embeds our id
// We don't check the sender, because we don't care... anyone is allowed to fund it. We'll give it back to the deployer, though.
txn OnCompletion
int UpdateApplication
==
assert
byte base64(cw==)
// compute state in HM_Set 0
int 0
itob
keccak256
app_global_put
byte base64(bA==)
global Round
app_global_put
byte base64(djA=)
byte base64()
app_global_put
byte base64(aA==)
int 0
app_global_put
b done
init:
global GroupSize
int 1
==
assert
txn OnCompletion
int NoOp
==
assert
done:
int 1
return
`,
  appClear: `#pragma version 3
// We're alone
global GroupSize
int 1
==
assert
// We're halted
byte base64(aA==)
app_global_get
int 1
==
assert
done:
int 1
return
`,
  ctc: `#pragma version 3
// Check size
global GroupSize
int 3
>=
assert
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
// Don't check anything else, because app does
// Check us
txn TypeEnum
int pay
==
int axfer
dup2
==
||
assert
txn RekeyTo
global ZeroAddress
==
assert
txn GroupIndex
int 3
>=
assert
done:
int 1
return
`,
  mapArgSize: 165,
  mapDataKeys: 0,
  mapDataSize: 0,
  mapRecordSize: 33,
  stepargs: [
    null,
    {
      count: 9,
      size: 452,
    },
    null,
    null,
    {
      count: 9,
      size: 438,
    },
    {
      count: 9,
      size: 398,
    },
    {
      count: 9,
      size: 398,
    },
    {
      count: 9,
      size: 398,
    },
    {
      count: 9,
      size: 400,
    },
    {
      count: 9,
      size: 438,
    },
    {
      count: 9,
      size: 398,
    },
    {
      count: 9,
      size: 398,
    },
    {
      count: 9,
      size: 398,
    },
  ],
  steps: [
    null,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 7
dup
substring 0 8
btoi
store 255
dup
substring 8 16
btoi
store 254
dup
substring 16 166
store 253
pop
// Handler 1
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 0
int 0
itob
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:37:15:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 5
itob
gtxn 0 Sender
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
gtxn 0 Sender
concat
load 254
itob
concat
int 0
itob // bool
substring 7 8
concat
gtxn 0 Sender
concat
gtxn 0 Sender
concat
int 0
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    null,
    null,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
gtxna 0 ApplicationArgs 7
dup
substring 0 8
btoi
store 250
dup
substring 8 40
store 249
pop
// Handler 4
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 4
int 4
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:62:16:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 1
itob
load 252
concat
load 1
==
assert
// compute state in HM_Set 5
int 5
itob
load 255
concat
load 254
itob
concat
load 252
concat
load 250
itob
concat
load 249
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
load 4
btoi
load 254
+
dup
gtxn 0 LastValid
>=
assert
dup
gtxn 1 LastValid
>=
assert
dup
gtxn 2 LastValid
>=
assert
dup
gtxn 3 LastValid
>=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
// Handler 5
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 4
int 4
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:66:18:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
-
load 251
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
gtxn 4 TypeEnum
int pay
==
assert
gtxn 4 Receiver
load 252
==
assert
gtxn 4 Amount
load 251
==
assert
gtxn 4 Sender
byte "{{ContractAddr}}"
==
assert
// check view bs
int 5
itob
load 253
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
load 255
concat
load 254
itob
concat
int 0
itob // bool
substring 7 8
concat
load 253
concat
load 253
concat
int 0
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 5
==
assert
load 3
btoi
gtxn 4 Fee
==
assert
// Check time limits
load 4
btoi
load 254
+
dup
gtxn 0 FirstValid
<=
assert
dup
gtxn 1 FirstValid
<=
assert
dup
gtxn 2 FirstValid
<=
assert
dup
gtxn 3 FirstValid
<=
assert
dup
gtxn 4 FirstValid
<=
assert
pop
load 4
btoi
load 254
int 20
+
+
dup
gtxn 0 LastValid
>=
assert
dup
gtxn 1 LastValid
>=
assert
dup
gtxn 2 LastValid
>=
assert
dup
gtxn 3 LastValid
>=
assert
dup
gtxn 4 LastValid
>=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
// Handler 6
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 4
int 4
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:71:20:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 5
itob
load 255
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
load 255
concat
load 254
itob
concat
int 0
itob // bool
substring 7 8
concat
load 255
concat
load 255
concat
int 0
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
load 4
btoi
load 254
int 20
+
+
dup
gtxn 0 FirstValid
<=
assert
dup
gtxn 1 FirstValid
<=
assert
dup
gtxn 2 FirstValid
<=
assert
dup
gtxn 3 FirstValid
<=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 80
btoi
store 252
dup
substring 80 112
store 251
pop
// Handler 7
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 5
int 5
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
itob
concat
load 251
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:86:17:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 2
itob
load 253
concat
load 1
==
assert
// compute state in HM_Set 4
int 4
itob
load 255
concat
load 254
itob
concat
load 251
concat
load 253
concat
load 252
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 41
btoi
store 253
dup
substring 41 73
store 252
dup
substring 73 105
store 251
dup
substring 105 113
btoi
store 250
pop
gtxna 0 ApplicationArgs 7
dup
substring 0 1
btoi
store 249
pop
// Handler 8
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 6
int 6
itob
load 255
concat
load 254
itob
concat
load 253
itob // bool
substring 7 8
concat
load 252
concat
load 251
concat
load 250
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:50:19:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
load 249
bz l0
// check view bs
int 4
itob
load 251
concat
load 1
==
assert
// compute state in HM_Set 7
int 7
itob
load 255
concat
load 254
itob
concat
load 252
concat
load 251
concat
load 250
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
b checkAccts
l0:
load 253
bz l1
// check view bs
int 2
itob
load 251
concat
load 1
==
assert
// compute state in HM_Set 4
int 4
itob
load 255
concat
load 254
itob
concat
load 252
concat
load 251
concat
load 250
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
b checkAccts
l1:
// check view bs
int 5
itob
load 251
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
load 255
concat
load 254
itob
concat
load 253
itob // bool
substring 7 8
concat
load 252
concat
load 251
concat
load 250
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
gtxna 0 ApplicationArgs 7
dup
substring 0 8
btoi
store 250
dup
substring 8 40
store 249
pop
// Handler 9
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 7
int 7
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:62:16:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 3
itob
load 252
concat
load 1
==
assert
// compute state in HM_Set 8
int 8
itob
load 255
concat
load 254
itob
concat
load 252
concat
load 250
itob
concat
load 249
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
load 4
btoi
load 254
+
dup
gtxn 0 LastValid
>=
assert
dup
gtxn 1 LastValid
>=
assert
dup
gtxn 2 LastValid
>=
assert
dup
gtxn 3 LastValid
>=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
// Handler 10
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 7
int 7
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:66:18:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
-
load 251
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
gtxn 4 TypeEnum
int pay
==
assert
gtxn 4 Receiver
load 252
==
assert
gtxn 4 Amount
load 251
==
assert
gtxn 4 Sender
byte "{{ContractAddr}}"
==
assert
// check view bs
int 5
itob
load 253
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
load 255
concat
load 254
itob
concat
int 0
itob // bool
substring 7 8
concat
load 253
concat
load 253
concat
int 0
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 5
==
assert
load 3
btoi
gtxn 4 Fee
==
assert
// Check time limits
load 4
btoi
load 254
+
dup
gtxn 0 FirstValid
<=
assert
dup
gtxn 1 FirstValid
<=
assert
dup
gtxn 2 FirstValid
<=
assert
dup
gtxn 3 FirstValid
<=
assert
dup
gtxn 4 FirstValid
<=
assert
pop
load 4
btoi
load 254
int 20
+
+
dup
gtxn 0 LastValid
>=
assert
dup
gtxn 1 LastValid
>=
assert
dup
gtxn 2 LastValid
>=
assert
dup
gtxn 3 LastValid
>=
assert
dup
gtxn 4 LastValid
>=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 104
store 252
dup
substring 104 112
btoi
store 251
pop
// Handler 11
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 7
int 7
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
concat
load 251
itob
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:71:20:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 5
itob
load 255
concat
load 1
==
assert
// compute state in HM_Set 6
int 6
itob
load 255
concat
load 254
itob
concat
int 0
itob // bool
substring 7 8
concat
load 255
concat
load 255
concat
int 0
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
load 4
btoi
load 254
int 20
+
+
dup
gtxn 0 FirstValid
<=
assert
dup
gtxn 1 FirstValid
<=
assert
dup
gtxn 2 FirstValid
<=
assert
dup
gtxn 3 FirstValid
<=
assert
pop
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
    `#pragma version 3
gtxna 0 ApplicationArgs 1
store 0
gtxna 0 ApplicationArgs 2
store 1
gtxna 0 ApplicationArgs 3
store 2
gtxna 0 ApplicationArgs 4
store 3
gtxna 0 ApplicationArgs 5
store 4
gtxna 0 ApplicationArgs 8
store 5
int 0
store 6
gtxna 0 ApplicationArgs 6
dup
substring 0 32
store 255
dup
substring 32 40
btoi
store 254
dup
substring 40 72
store 253
dup
substring 72 80
btoi
store 252
dup
substring 80 112
store 251
pop
// Handler 12
// Check txnAppl
gtxn 0 TypeEnum
int appl
==
assert
gtxn 0 ApplicationID
byte "{{ApplicationID}}"
btoi
==
assert
gtxn 0 NumAppArgs
int 9
==
assert
// Check txnToHandler
gtxn 1 TypeEnum
int pay
==
assert
gtxn 1 Receiver
txn Sender
==
assert
gtxn 1 Amount
gtxn 2 Fee
int 100000
+
==
assert
// Check txnFromHandler (us)
txn GroupIndex
int 2
==
assert
txn TypeEnum
int pay
==
assert
txn Amount
int 0
==
assert
txn Receiver
gtxn 1 Sender
==
assert
// compute state in HM_Check 8
int 8
itob
load 255
concat
load 254
itob
concat
load 253
concat
load 252
itob
concat
load 251
concat
keccak256
gtxna 0 ApplicationArgs 0
==
assert
txn CloseRemainderTo
gtxn 1 Sender
==
assert
// Run body
// "CheckPay"
// "./Nft-Auction.rsh:86:17:dot"
// "[]"
gtxn 3 TypeEnum
int pay
==
assert
gtxn 3 Receiver
byte "{{ContractAddr}}"
==
assert
gtxn 3 Amount
load 3
btoi
==
assert
// We don't care who the sender is... this means that you can get other people to pay for you if you want.
// check view bs
int 2
itob
load 253
concat
load 1
==
assert
// compute state in HM_Set 4
int 4
itob
load 255
concat
load 254
itob
concat
load 251
concat
load 253
concat
load 252
itob
concat
keccak256
load 0
==
assert
load 2
btoi
int 0
==
assert
// Check GroupSize
global GroupSize
int 4
==
assert
load 3
btoi
int 0
==
assert
// Check time limits
checkAccts:
gtxn 0 NumAccounts
load 6
==
assert
done:
int 1
return
`,
  ],
  unsupported: [],
  version: 1,
  viewKeys: 1,
  viewSize: 40,
};
const _ETH = {
  ABI: `[
  {
    "inputs": [],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "e0",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v21",
                "type": "uint256"
              }
            ],
            "internalType": "struct T0",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v26",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "uint8[150]",
                "name": "v28",
                "type": "uint8[150]"
              }
            ],
            "internalType": "struct T6",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e1",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T20",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e10",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T20",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e11",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v114",
                "type": "uint256"
              }
            ],
            "internalType": "struct T11",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T15",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e12",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              }
            ],
            "internalType": "struct T12",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T13",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e4",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e5",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e6",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v114",
                "type": "uint256"
              }
            ],
            "internalType": "struct T11",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T15",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e7",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "v31",
                "type": "bool"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T9",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "bool",
                "name": "v57",
                "type": "bool"
              }
            ],
            "internalType": "struct T17",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T18",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e8",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              }
            ],
            "internalType": "struct T12",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T19",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "e9",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "NFT_owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v21",
                "type": "uint256"
              }
            ],
            "internalType": "struct T0",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v26",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "uint8[150]",
                "name": "v28",
                "type": "uint8[150]"
              }
            ],
            "internalType": "struct T6",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m1",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T20",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m10",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T20",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m11",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v114",
                "type": "uint256"
              }
            ],
            "internalType": "struct T11",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T15",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m12",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              }
            ],
            "internalType": "struct T12",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T13",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m4",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m5",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T8",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m6",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v114",
                "type": "uint256"
              }
            ],
            "internalType": "struct T11",
            "name": "svs",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T15",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m7",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "v31",
                "type": "bool"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v150",
                "type": "uint256"
              }
            ],
            "internalType": "struct T9",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "bool",
                "name": "v57",
                "type": "bool"
              }
            ],
            "internalType": "struct T17",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T18",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m8",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address payable",
                "name": "v25",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v27",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v32",
                "type": "address"
              },
              {
                "internalType": "address payable",
                "name": "v33",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "v34",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v59",
                "type": "uint256"
              }
            ],
            "internalType": "struct T16",
            "name": "svs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v111",
                "type": "uint256"
              },
              {
                "internalType": "address payable",
                "name": "v112",
                "type": "address"
              }
            ],
            "internalType": "struct T12",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T19",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "m9",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]`,
  Bytecode: `0x608060408190527f49ff028a829527a47ec6839c7147b484eccf5a2a94853eddac09cef44d9d4e9e90600090a160408051602080820183524382526000600181905583519182018190529192016040516020818303038152906040526002908051906020019062000072929190620000b4565b50506040805160208082018352600080835293518252825180820185905291518284015282518083038401815260609092019092528051910120905562000197565b828054620000c2906200015a565b90600052602060002090601f016020900481019282620000e6576000855562000131565b82601f106200010157805160ff191683800117855562000131565b8280016001018555821562000131579182015b828111156200013157825182559160200191906001019062000114565b506200013f92915062000143565b5090565b5b808211156200013f576000815560010162000144565b6002810460018216806200016f57607f821691505b602082108114156200019157634e487b7160e01b600052602260045260246000fd5b50919050565b61181980620001a76000396000f3fe6080604052600436106100a05760003560e01c8063833015d411610064578063833015d41461012b578063a38c5a4f1461013e578063b3f521f614610151578063b936be8714610164578063bdd75a0214610177578063c7417a151461018a576100a7565b806310c0ee09146100ac578063158d7d95146100c15780631bedb015146100d45780632c5ab172146100e75780635cf275dd146100fa576100a7565b366100a757005b600080fd5b6100bf6100ba36600461137b565b61019d565b005b6100bf6100cf366004611397565b610342565b6100bf6100e236600461137b565b61046a565b6100bf6100f5366004611397565b6105ee565b34801561010657600080fd5b5061010f610736565b6040516001600160a01b03909116815260200160405180910390f35b6100bf610139366004611397565b610857565b6100bf61014c366004611397565b6109dc565b6100bf61015f366004611397565b610aeb565b6100bf610172366004611409565b610b8d565b6100bf61018536600461137b565b610c60565b6100bf610198366004611397565b610f17565b6040516101b19060079083906020016116f6565b6040516020818303038152906040528051906020012060001c600054146101d757600080fd5b600080556101ed602082013560a0830135611775565b43106101f857600080fd5b341561020357600080fd5b7fc996be77cce2c644cd76e387a9772aa57357e95f809aaed65b9027a65dfc783c8160405161023291906115a2565b60405180910390a1604080516020810190915260008152610259608083016060840161133e565b6001600160a01b031680825260036001556040805160208082019390935281518082038401815290820190915280516102969260029201906111c8565b5061029f61124c565b6102ac602084018461133e565b6001600160a01b03168152602080840135908201526102d1608084016060850161133e565b6001600160a01b0316604082015260c083013560608201526102fa610100840160e0850161133e565b6001600160a01b031660808201524360a082015260405161032290600890839060200161169d565b60408051601f198184030181529190528051602090910120600055505050565b604051610356906008908390602001611689565b6040516020818303038152906040528051906020012060001c6000541461037c57600080fd5b60008055341561038b57600080fd5b7ff32e25cfce8ff9ee34874b43160ba1d4904f5a2924b260a1cee9738b7000f9d6816040516103ba91906115d5565b60405180910390a16103ca61129d565b6103d7602083018361133e565b81516001600160a01b0390911690528051602080840135918101919091528101516001905261040c60a083016080840161133e565b6020808301516001600160a01b03909216910152610430606083016040840161133e565b6020820180516001600160a01b039092166040909201919091528051606080850135910152514360809091015261046681610f8f565b5050565b60405161047e9060049083906020016116f6565b6040516020818303038152906040528051906020012060001c600054146104a457600080fd5b600080556104ba602082013560a0830135611775565b43106104c557600080fd5b34156104d057600080fd5b7f7547d9c09dbb79953d914e37698c126d4f756156b8017b1645d39f58cdb81675816040516104ff91906115a2565b60405180910390a1604080516020810190915260008152610526608083016060840161133e565b6001600160a01b0316808252600180556040805160208082019390935281518082038401815290820190915280516105629260029201906111c8565b5061056b61124c565b610578602084018461133e565b6001600160a01b031681526020808401359082015261059d608084016060850161133e565b6001600160a01b0316604082015260c083013560608201526105c6610100840160e0850161133e565b6001600160a01b031660808201524360a082015260405161032290600590839060200161169d565b6040516106029060079083906020016116f6565b6040516020818303038152906040528051906020012060001c6000541461062857600080fd5b600080556020810135610640601460a0840135611775565b61064a9190611775565b43101561065657600080fd5b341561066157600080fd5b7fe6881ce256c4e3a25b085a934b11900e7ab6fc906e13bffbf75ae0ed5e8d44878160405161069091906115c7565b60405180910390a16106a061129d565b6106ad602083018361133e565b81516001600160a01b03909116905280516020808401803592820192909252820151600090526106dd908361133e565b6020808301516001600160a01b03909216918101919091526107019083018361133e565b6020820180516001600160a01b0390921660409092019190915280516000606090910152514360809091015261046681610f8f565b60006001805414156107ec5760006002805461075190611799565b80601f016020809104026020016040519081016040528092919081815260200182805461077d90611799565b80156107ca5780601f1061079f576101008083540402835291602001916107ca565b820191906000526020600020905b8154815290600101906020018083116107ad57829003601f168201915b50505050508060200190518101906107e291906113b2565b5191506108549050565b600260015414156108065760006002805461075190611799565b600360015414156108205760006002805461075190611799565b6004600154141561083a5760006002805461075190611799565b600560015414156100a75760006002805461075190611799565b90565b60405161086b9060049083906020016116f6565b6040516020818303038152906040528051906020012060001c6000541461089157600080fd5b600080556108a7602082013560a0830135611775565b43101580156108d2575060208101356108c5601460a0840135611775565b6108cf9190611775565b43105b6108db57600080fd5b346080820135146108eb57600080fd5b6108fb608082016060830161133e565b6040516001600160a01b039190911690608083013580156108fc02916000818181858888f19350505050158015610936573d6000803e3d6000fd5b507f6a879ded89a306ded198b7260818272b7098217590a7dcffb9b301f03cbdc6dc8160405161096691906115c7565b60405180910390a161097661129d565b610983602083018361133e565b81516001600160a01b039091169052805160208084013591810191909152810151600090526109b8606083016040840161133e565b6020808301516001600160a01b03909216910152610701606083016040840161133e565b6040516109f09060079083906020016116f6565b6040516020818303038152906040528051906020012060001c60005414610a1657600080fd5b60008055610a2c602082013560a0830135611775565b4310158015610a5757506020810135610a4a601460a0840135611775565b610a549190611775565b43105b610a6057600080fd5b34608082013514610a7057600080fd5b610a80608082016060830161133e565b6040516001600160a01b039190911690608083013580156108fc02916000818181858888f19350505050158015610abb573d6000803e3d6000fd5b507f17422f2dfd16a93c6e95bad68f93407f83f4aaa1b451622d9a51e117cd90b7978160405161096691906115c7565b604051610aff9060049083906020016116f6565b6040516020818303038152906040528051906020012060001c60005414610b2557600080fd5b600080556020810135610b3d601460a0840135611775565b610b479190611775565b431015610b5357600080fd5b3415610b5e57600080fd5b7f91078a2ab594b065482f3f8c5e7a025992f987b16f8a1393641b4b8ecd0b2f6f8160405161069091906115c7565b60408051600060208201528235918101919091526060016040516020818303038152906040528051906020012060001c60005414610bca57600080fd5b600080553415610bd957600080fd5b7f70035870112197a7da31bdc06b3c24e4999909832e23e83a888f26485893424081604051610c089190611624565b60405180910390a1610c1861129d565b80513390819052815160408085013560209283015281840180516000908190528151909301849052805190910192909252815160600152514360809091015261046681610f8f565b604051610c74906006908390602001611760565b6040516020818303038152906040528051906020012060001c60005414610c9a57600080fd5b600080553415610ca957600080fd5b610cba610100820160e08301611361565b15610e28577f43c550b11e285bd2082107065bfcadeb5b39337a678afbd901e2d00d56e1b37981604051610cee91906115fc565b60405180910390a1604080516020810190915260008152610d1560a083016080840161133e565b6001600160a01b03168082526004600155604080516020808201939093528151808203840181529082019091528051610d529260029201906111c8565b506040805160c08101825260008082526020808301829052928201819052606082018190526080820181905260a082015290610d909084018461133e565b6001600160a01b0316815260208084013590820152610db5608084016060850161133e565b6001600160a01b03166040820152610dd360a084016080850161133e565b6001600160a01b0316606082015260a08084013560808301524390820152604051610e0590600790839060200161170a565b60408051601f19818403018152919052805160209091012060005550610f149050565b7f43c550b11e285bd2082107065bfcadeb5b39337a678afbd901e2d00d56e1b37981604051610e5791906115fc565b60405180910390a1610e6761129d565b610e74602083018361133e565b81516001600160a01b0390911690528051602080840135910152610e9e6060830160408401611361565b60208201519015159052610eb8608083016060840161133e565b6020808301516001600160a01b03909216910152610edc60a083016080840161133e565b6020820180516001600160a01b03909216604090920191909152805160a0840135606090910152514360809091015261046681610f8f565b50565b604051610f2b906005908390602001611689565b6040516020818303038152906040528051906020012060001c60005414610f5157600080fd5b600080553415610f6057600080fd5b7fd1fd169d0c2de9ad958b0a4e0107fe4eecbecdcd44af97984956c1f88af5598e816040516103ba91906115d5565b60208101515115611078576040805160208101909152600081526020828101516040908101516001600160a01b031680845260026001558151928301520160405160208183030381529060405260029080519060200190610ff19291906111c8565b506040805160c081018252600080825260208083018281528385018381526060808601858152608080880187815260a089019788528b51516001600160a01b039081168a528c518801519096528b87018051880151871690955284518a015190951690915282519091015190925251015190915291519091610e059160049184910161170a565b6040805160208101909152600081526020828101516040908101516001600160a01b0316808452600560015581519283015201604051602081830303815290604052600290805190602001906110cf9291906111c8565b506040805160e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c08101919091528251516001600160a01b039081168252835160209081015181840190815281860180515115156040808701918252825185015186166060808901918252845183015188166080808b01918252865183015160a0808d01918252975182015160c0808e01918252875160069c81019c909c528d518d16978c01979097529851938a019390935294511515948801949094529051871693860193909352905190941693830193909352915160e0820152905161010082015261012001610322565b8280546111d490611799565b90600052602060002090601f0160209004810192826111f6576000855561123c565b82601f1061120f57805160ff191683800117855561123c565b8280016001018555821561123c579182015b8281111561123c578251825591602001919060010190611221565b506112489291506112eb565b5090565b6040518060c0016040528060006001600160a01b031681526020016000815260200160006001600160a01b031681526020016000815260200160006001600160a01b03168152602001600081525090565b604080516080810182526000918101828152606082019290925290819081526040805160a0810182526000808252602082810182905292820181905260608201819052608082015291015290565b5b8082111561124857600081556001016112ec565b8035801515811461131057600080fd5b919050565b60006101008284031215611327578081fd5b50919050565b600060e08284031215611327578081fd5b60006020828403121561134f578081fd5b813561135a816117ce565b9392505050565b600060208284031215611372578081fd5b61135a82611300565b6000610100828403121561138d578081fd5b61135a8383611315565b600060e082840312156113a8578081fd5b61135a838361132d565b6000602082840312156113c3578081fd5b6040516020810181811067ffffffffffffffff821117156113f257634e487b7160e01b83526041600452602483fd5b6040528251611400816117ce565b81529392505050565b60006113208284031215611327578081fd5b8035611426816117ce565b6001600160a01b0390811683526020828101359084015260408201359061144c826117ce565b8082166040850152606083013560608501526080830135915061146e826117ce565b16608083015260a090810135910152565b803582526020810135611491816117ce565b6001600160a01b03166020929092019190915250565b6114b182826114c8565b6114bd60c08201611300565b151560c08301525050565b80356114d3816117ce565b6001600160a01b039081168352602082810135908401526040820135906114f9826117ce565b9081166040840152606082013590611510826117ce565b1660608301526080818101359083015260a090810135910152565b8035611536816117ce565b6001600160a01b0381811684526020838101359085015261155960408401611300565b1515604085015260608301359150611570826117ce565b9081166060840152608082013590611587826117ce565b16608083015260a0818101359083015260c090810135910152565b61010081016115b182846114c8565b6115c160c0830160c0850161147f565b92915050565b60e081016115c182846114a7565b60e081016115e3828461141b565b6115ef60c08401611300565b151560c083015292915050565b610100810161160b828461152b565b61161760e08401611300565b151560e083015292915050565b60006113208201905082358252602080840135818401526040840135604084015260608301606085016000805b609681101561167e57823560ff811680821461166b578384fd5b8552509284019291840191600101611651565b505050505092915050565b82815260e0810161135a602083018461141b565b600060e08201905083825260018060a01b0380845116602084015260208401516040840152806040850151166060840152606084015160808401528060808501511660a08401525060a083015160c08301529392505050565b82815260e0810161135a60208301846114c8565b82815260e0810161135a602083018480516001600160a01b03908116835260208083015190840152604080830151821690840152606080830151909116908301526080808201519083015260a090810151910152565b828152610100810161135a602083018461152b565b6000821982111561179457634e487b7160e01b81526011600452602481fd5b500190565b6002810460018216806117ad57607f821691505b6020821081141561132757634e487b7160e01b600052602260045260246000fd5b6001600160a01b0381168114610f1457600080fdfea26469706673582212208732eb9815e99e4876138ccf2bf665016ac56c8d390ffa96ab04aba34eb79d3164736f6c63430008020033`,
  BytecodeLen: 6592,
  Which: `oD`,
  deployMode: `DM_constructor`,
  views: {
    NFT: {
      owner: `NFT_owner`,
    },
  },
};

export const _Connectors = {
  ALGO: _ALGO,
  ETH: _ETH,
};

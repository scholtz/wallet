"use strict";(self["webpackChunkwallet"]=self["webpackChunkwallet"]||[]).push([[278],{76278:function(e,a,t){t.r(a),t.d(a,{default:function(){return pe}});t(44114),t(98992),t(72577),t(81454);var s=t(20641),l=t(90033),d=t(50953),o=t(57057),n=t(66278),i=t(67422),c=t(76159),r=t(29193),m=t(37855),p=t(59049),u=t(75220),f=t(40763),h=t(71729),_=t(17965),g=t.n(_),v=t(38880),b=t(64588),A=t(94335);const w={class:"field grid"},y={class:"col-12 mb-2 md:col-2 md:mb-0"},k={class:"col-12 md:col-10"},I={class:"field grid"},D={class:"col-12 mb-2 md:col-2 md:mb-0"},L={class:"col-12 md:col-10"},$={class:"field grid"},x={class:"col-12 mb-2 md:col-2 md:mb-0"},T={class:"col-12 md:col-10"},F={class:"field grid"},S={class:"col-12 mb-2 md:col-2 md:mb-0"},C={class:"col-12 md:col-10"},R={class:"field grid"},V={class:"col-12 mb-2 md:col-2 md:mb-0"},P={class:"col-12 md:col-10"},N={class:"field grid"},W={class:"col-12 mb-2 md:col-2 md:mb-0"},B={class:"col-12 md:col-10"},U={class:"field grid"},G={for:"amountToDeposit",class:"col-12 mb-2 md:col-2 md:mb-0"},j={class:"col-12 md:col-10"},E={class:"field grid"},H={for:"amountToDeposit",class:"col-12 mb-2 md:col-2 md:mb-0"},M={class:"col-12 md:col-10"},O={class:"field grid"},Q={class:"col-12 md:col-10"},X={key:0,class:"grid"},z={class:"col"},K={class:"p-input-icon-left"},q={key:0},J={class:"field grid"},Z={for:"optin",class:"col-12 mb-2 md:col-2 md:mb-0"},Y={class:"col-12 md:col-10"},ee={class:"field grid"},ae={for:"withdrawAsset",class:"col-12 mb-2 md:col-2 md:mb-0"},te={class:"col-12 md:col-10"},se={class:"field grid"},le={for:"withdrawAmount",class:"col-12 mb-2 md:col-2 md:mb-0"},de={class:"col-12 md:col-10"},oe={class:"field grid"},ne={class:"col-12 md:col-10"},ie={class:"field grid"},ce={key:0,class:"field grid"};var re=(0,s.pM)({__name:"ScheduledPaymentDetail",setup(e){const a=(0,u.lq)(),t=(0,n.Pj)(),_=(0,u.rd)(),re=(0,d.Kh)({selection:"",payTo:"",assetData:new m.A,account:a.params.account,withdrawAmount:0,maxAmount:0,stepAmount:1,appInfo:{appId:0,appAddress:"",start:0,period:0,balanceFee:0,fee:0},assets:[],filters:{global:{value:null,matchMode:i.Rn.CONTAINS}},period:"86400",optionsSchedule:[{value:"60",name:"Run each minute"},{value:"3600",name:"Run each hour"},{value:"86400",name:"Run each day"}],start:Math.round((new Date).getTime()/1e3),txID:"",action:"",hash:"",client:"",appId:"",fee:1e3,feeAssetId:0,feeAssetData:new m.A,optin:0,withdrawAsset:"",amountToDeposit:0,script:""}),me=()=>{const e=t.state.wallet.privateAccounts.find((e=>e.addr==re.account));return!!e&&(!!e.data&&e.data[t.state.config.env])},pe=()=>{const e=me();if(!re.assetData)return 0;if("ARC200"==re.assetData.type)return re.assetData?re.assetData.amount/10**re.assetData.decimals:0;if("ASA"==re.assetData.type)return re.assetData?re.assetData.amount/10**re.assetData.decimals:0;{let a=e.amount/1e6-.1;return e["assets"]&&e["assets"].length>0&&(a-=.1*e["assets"].length),a}},ue=()=>{if(!re.assetData.decimals)return 1;const e=Math.pow(10,-1*re.assetData.decimals);return e};(0,s.wB)((()=>re.assetData),(async()=>{re.maxAmount=pe(),re.stepAmount=ue(),await t.dispatch("wallet/prolong")}),{deep:!0});const fe=async()=>{try{const e=await t.dispatch("algod/getAlgod"),s=await t.dispatch("indexer/getIndexer"),l=(0,v.RF)(t.state.config.env),d=await e.getApplicationByID(l).do(),o=d.params["global-state"].find((e=>"ZmE="==e.key)).value.uint;re.feeAssetId=o,re.feeAssetData=await t.dispatch("indexer/getAsset",{assetIndex:o});const n=a.params.account,i=(b["default"].decodeAddress(n),Number(a.params.appId));re.appId=i.toString();const c=await e.getApplicationBoxByName(l,(0,v.k$)(l,i).name).do(),r=(0,v.j5)(c.value),m=await e.getApplicationByID(i).do(),p=m.params["global-state"].find((e=>"cw=="==e.key)).value.uint,u=m.params["global-state"].find((e=>"cA=="==e.key)).value.uint;re.appInfo={appId:i,appAddress:b["default"].getApplicationAddress(i),start:p,period:u,balanceFee:r.funds,fee:r.fee};const f=await s.lookupAccountByID(b["default"].getApplicationAddress(i)).do(),h=[];let _=await t.dispatch("indexer/getAsset",{assetIndex:0});if(h.push({"asset-id":0,amount:f.account.amount,assetName:_.name,info:_}),f.account.assets)for(const a of f.account.assets){const e=await t.dispatch("indexer/getAsset",{assetIndex:a["asset-id"]});h.push({"asset-id":a["asset-id"],amount:a.amount,assetName:e.name,info:e})}re.assets=h}catch(e){console.error(e)}};(0,s.sV)((async()=>{await t.dispatch("wallet/prolong"),await fe();try{const a=JSON.parse(localStorage.getItem("currentAction")??"");if(a.selection&&(re.selection=a.selection),a.payTo&&(re.payTo=a.payTo),a.assetData){var e=new m.A;e.amount=a.assetData.amount,e["asset-id"]=a.assetData["asset-id"],e.decimals=a.assetData.decimals,e.label=a.assetData.label,e.name=a.assetData.name,e.type=a.assetData.type,e["unit-name"]=a.assetData["unit-name"],re.assetData=e}}catch(a){console.error(a.message??a)}}));const he=async()=>{try{const s=await t.dispatch("algod/getAlgod"),l={addr:a.params.account,signer:async(e,a)=>[]};var e=new v.Ld({resolveBy:"id",id:re.appInfo.appId,sender:l},s);const d=new b.AtomicTransactionComposer;await e.assetTransfer({assetAmount:0,assetReceiver:re.appInfo.appAddress,note:"",xferAsset:re.optin},{sendParams:{fee:h.Hv(2e3),atc:d},assets:[re.optin]});const o=await s.getTransactionParams().do(),n=b["default"].makePaymentTxnWithSuggestedParamsFromObject({amount:1e5,from:l.addr,suggestedParams:o,to:re.appInfo.appAddress}),i=d.buildGroup().map((e=>e.txn)),c=[n,i[0]],r=b["default"].assignGroupID(c);await t.dispatch("signer/returnToSignAll","ScheduledPayments"),await t.dispatch("signer/toSignArray",{txs:r}),await _.push("/signAll")}catch(s){console.error(s)}},_e=async()=>{try{const s=await t.dispatch("algod/getAlgod"),l={addr:a.params.account,signer:async(e,a)=>[]},d=(0,v.RF)(t.state.config.env);var e=new v.s7({resolveBy:"id",id:d,sender:l},s);const o=await s.getTransactionParams().do(),n=b["default"].makeAssetTransferTxnWithSuggestedParamsFromObject({amount:re.amountToDeposit*10**re.feeAssetData.decimals,assetIndex:re.feeAssetId,from:l.addr,suggestedParams:o,to:b["default"].getApplicationAddress(d)}),i=(0,v.k$)(d,re.appInfo.appId),c=new b.AtomicTransactionComposer;await e.fundTask({deposit:n,taskAppId:re.appInfo.appId},{sendParams:{fee:h.Hv(1e3),atc:c},boxes:[i]});const r=c.buildGroup().map((e=>e.txn));await t.dispatch("signer/returnToSignAll","ScheduledPayments"),await t.dispatch("signer/toSignArray",{txs:r}),await _.push("/signAll")}catch(s){console.error(s)}},ge=async()=>{try{const s=await t.dispatch("algod/getAlgod"),l={addr:a.params.account,signer:async(e,a)=>[]};var e=new v.Ld({resolveBy:"id",id:re.appInfo.appId,sender:l},s);const d=new b.AtomicTransactionComposer;if(Number(re.withdrawAsset)>0){const a=await t.dispatch("indexer/getAsset",{assetIndex:re.withdrawAsset});await e.assetTransfer({assetAmount:Number(re.withdrawAmount)*10**a.decimals,assetReceiver:l.addr,note:"",xferAsset:Number(re.withdrawAsset)},{sendParams:{fee:h.Hv(2e3),atc:d},assets:[Number(re.withdrawAsset)]})}else await e.payment({amount:Number(re.withdrawAmount)*10**6,receiver:l.addr,note:""},{sendParams:{fee:h.Hv(2e3),atc:d}});await s.getTransactionParams().do();const o=d.buildGroup().map((e=>e.txn));await t.dispatch("signer/returnTo","ScheduledPayments"),await t.dispatch("signer/toSign",{txx:o[0]});const n=(0,p.A)(Buffer.from(b["default"].encodeUnsignedTransaction(o[0])).toString("base64"));re.txID=o[0].txID(),_.push(`/sign/${a.params.account}/${n}`)}catch(s){console.error(s)}},ve=e=>{_.push({name:"PayToAccountAndAsset",params:{account:a.params.account,toAccountDirect:re.appInfo.appAddress,asset:e["asset-id"]}})};async function be(e){g()(e)&&await t.dispatch("toast/openSuccess",`${e} copied to clipboard`)}const Ae=()=>{_.push({name:"SwapWithTo",params:{account:a.params.account,toAsset:re.feeAssetId}})},we=async()=>{try{const e=await t.dispatch("algod/getAlgod"),a=await e.getApplicationByID(re.appInfo.appId).do(),s=Buffer.from(a.params["global-state"].find((e=>"aWQ="==e.key)).value.bytes,"base64").subarray(2).toString("utf-8"),l=await A.A.get(`https://api-scheduler.biatec.io/v1/file/${s}/input.yaml`);re.script=l.data}catch(e){console.error(e)}};return(e,a)=>{const t=(0,s.g2)("InputNumber"),n=(0,s.g2)("InputText"),i=(0,s.g2)("Column"),m=(0,s.g2)("DataTable"),p=(0,s.g2)("InputGroup"),u=(0,s.g2)("Textarea"),h=(0,s.g2)("Card");return(0,s.uX)(),(0,s.Wv)(o.A,null,{default:(0,s.k6)((()=>[(0,s.Lk)("h1",null,(0,l.v_)(e.$t("scheduled_payments.title")),1),(0,s.bF)(h,null,{content:(0,s.k6)((()=>[(0,s.Lk)("p",null,(0,l.v_)(e.$t("scheduled_payments.description_detail")),1),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.details_title")),1),(0,s.Lk)("div",w,[(0,s.Lk)("label",y,(0,l.v_)(e.$t("scheduled_payments.app_id")),1),(0,s.Lk)("div",k,(0,l.v_)(re.appInfo.appId),1)]),(0,s.Lk)("div",I,[(0,s.Lk)("label",D,(0,l.v_)(e.$t("scheduled_payments.appAddress")),1),(0,s.Lk)("div",L,(0,l.v_)(re.appInfo.appAddress),1)]),(0,s.Lk)("div",$,[(0,s.Lk)("label",x,(0,l.v_)(e.$t("scheduled_payments.period")),1),(0,s.Lk)("div",T,(0,l.v_)(re.appInfo.period)+" "+(0,l.v_)(e.$t("scheduled_payments.seconds")),1)]),(0,s.Lk)("div",F,[(0,s.Lk)("label",S,(0,l.v_)(e.$t("scheduled_payments.start")),1),(0,s.Lk)("div",C,(0,l.v_)(new Date(1e3*re.appInfo.start)),1)]),(0,s.Lk)("div",R,[(0,s.Lk)("label",V,(0,l.v_)(e.$t("scheduled_payments.feeBalance")),1),(0,s.Lk)("div",P,(0,l.v_)((0,d.R1)(f.A)(re.appInfo.balanceFee,re.feeAssetData["unit-name"]??re.feeAssetData.name,re.feeAssetData.decimals)),1)]),(0,s.Lk)("div",N,[(0,s.Lk)("label",W,(0,l.v_)(e.$t("scheduled_payments.execution_fee")),1),(0,s.Lk)("div",B,(0,l.v_)((0,d.R1)(f.A)(re.appInfo.fee,re.feeAssetData["unit-name"]??re.feeAssetData.name,re.feeAssetData.decimals)),1)]),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.deposit_fee_title")),1),(0,s.Lk)("div",U,[(0,s.Lk)("label",G,(0,l.v_)(e.$t("scheduled_payments.fee_asset_id")),1),(0,s.Lk)("div",j,[(0,s.bF)((0,d.R1)(r.A),{size:"small",link:"",onClick:a[0]||(a[0]=e=>be(re.feeAssetId))},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(re.feeAssetId),1)])),_:1}),(0,s.bF)((0,d.R1)(r.A),{severity:"secondary",size:"small",onClick:Ae},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.get_more")),1)])),_:1})])]),(0,s.Lk)("div",E,[(0,s.Lk)("label",H,(0,l.v_)(e.$t("scheduled_payments.amount_to_deposit")),1),(0,s.Lk)("div",M,[(0,s.bF)(t,{itemId:"amountToDeposit",modelValue:re.amountToDeposit,"onUpdate:modelValue":a[1]||(a[1]=e=>re.amountToDeposit=e),min:0,step:1e-6,maxFractionDigits:6,class:"w-full"},null,8,["modelValue"])])]),(0,s.Lk)("div",O,[a[9]||(a[9]=(0,s.Lk)("label",{class:"col-12 mb-2 md:col-2 md:mb-0"},null,-1)),(0,s.Lk)("div",Q,[(0,s.bF)((0,d.R1)(r.A),{severity:"primary",onClick:_e},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.deposit")),1)])),_:1})])]),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.list_of_assets")),1),(0,s.bF)(m,{selection:re.selection,"onUpdate:selection":a[3]||(a[3]=e=>re.selection=e),value:re.assets,"responsive-layout":"scroll","selection-mode":"single",paginator:!0,rows:20,filters:re.filters,"onUpdate:filters":a[4]||(a[4]=e=>re.filters=e),filterDisplay:"menu",globalFilterFields:["asset-id","assetName"]},{header:(0,s.k6)((()=>[re.filters["global"]?((0,s.uX)(),(0,s.CE)("div",X,[(0,s.Lk)("div",z,[(0,s.Lk)("span",K,[a[10]||(a[10]=(0,s.Lk)("i",{class:"pi pi-search"},null,-1)),(0,s.bF)(n,{modelValue:re.filters["global"].value,"onUpdate:modelValue":a[2]||(a[2]=e=>re.filters["global"].value=e),placeholder:"Keyword Search"},null,8,["modelValue"])])])])):(0,s.Q3)("",!0)])),empty:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.assets_loading")),1)])),default:(0,s.k6)((()=>[(0,s.bF)(i,{field:"assetName",header:e.$t("scheduled_payments.asset_id"),sortable:!0},null,8,["header"]),(0,s.bF)(i,{header:e.$t("scheduled_payments.asset_id"),sortable:!0},{body:(0,s.k6)((e=>[(0,s.eW)((0,l.v_)(e.data["asset-id"]),1)])),_:1},8,["header"]),(0,s.bF)(i,{header:e.$t("scheduled_payments.asset_name"),sortable:!0},{body:(0,s.k6)((e=>[(0,s.eW)((0,l.v_)(e.data.info.name),1)])),_:1},8,["header"]),(0,s.bF)(i,{field:"amount",header:e.$t("scheduled_payments.asset_amount"),sortable:!0},{body:(0,s.k6)((e=>[e.data.amount&&e.data.info?((0,s.uX)(),(0,s.CE)("span",q,(0,l.v_)((0,d.R1)(f.A)(e.data.amount,e.data.info["unit-name"]??e.data.info.name,e.data.info.decimals)),1)):(0,s.Q3)("",!0)])),_:1},8,["header"]),(0,s.bF)(i,{header:e.$t("scheduled_payments.actions"),sortable:!0},{body:(0,s.k6)((a=>[(0,s.bF)((0,d.R1)(r.A),{onClick:e=>ve(a.data)},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.deposit")),1)])),_:2},1032,["onClick"])])),_:1},8,["header"])])),_:1},8,["selection","value","filters"]),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.optin_title")),1),(0,s.Lk)("div",J,[(0,s.Lk)("label",Z,(0,l.v_)(e.$t("scheduled_payments.optin_to_asset")),1),(0,s.Lk)("div",Y,[(0,s.bF)(p,null,{default:(0,s.k6)((()=>[(0,s.bF)(t,{itemId:"optin",modelValue:re.optin,"onUpdate:modelValue":a[5]||(a[5]=e=>re.optin=e),min:0,step:1,class:"w-full"},null,8,["modelValue"]),(0,s.bF)((0,d.R1)(r.A),{severity:"secondary",class:"col-2",onClick:he},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.optin_click")),1)])),_:1})])),_:1})])]),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.withdraw_asset_title")),1),(0,s.Lk)("div",ee,[(0,s.Lk)("label",ae,(0,l.v_)(e.$t("scheduled_payments.withdraw_asset")),1),(0,s.Lk)("div",te,[(0,s.bF)((0,d.R1)(c.A),{inputId:"withdrawAsset",options:re.assets,modelValue:re.withdrawAsset,"onUpdate:modelValue":a[6]||(a[6]=e=>re.withdrawAsset=e),optionLabel:"assetName",optionValue:"asset-id",class:"w-full"},null,8,["options","modelValue"])])]),(0,s.Lk)("div",se,[(0,s.Lk)("label",le,(0,l.v_)(e.$t("scheduled_payments.withdraw_amount")),1),(0,s.Lk)("div",de,[(0,s.bF)(p,null,{default:(0,s.k6)((()=>[(0,s.bF)(t,{itemId:"withdrawAmount",modelValue:re.withdrawAmount,"onUpdate:modelValue":a[7]||(a[7]=e=>re.withdrawAmount=e),min:0,step:1e-6,maxFractionDigits:6,class:"w-full"},null,8,["modelValue"])])),_:1})])]),(0,s.Lk)("div",oe,[a[11]||(a[11]=(0,s.Lk)("label",{class:"col-12 mb-2 md:col-2 md:mb-0"},null,-1)),(0,s.Lk)("div",ne,[(0,s.bF)((0,d.R1)(r.A),{severity:"secondary",onClick:ge},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.withdraw_click")),1)])),_:1})])]),(0,s.Lk)("h2",null,(0,l.v_)(e.$t("scheduled_payments.load_script_title")),1),(0,s.Lk)("div",ie,[(0,s.bF)((0,d.R1)(r.A),{severity:"secondary",onClick:we},{default:(0,s.k6)((()=>[(0,s.eW)((0,l.v_)(e.$t("scheduled_payments.load_click")),1)])),_:1})]),re.script?((0,s.uX)(),(0,s.CE)("div",ce,[(0,s.bF)(u,{id:"script",modelValue:re.script,"onUpdate:modelValue":a[8]||(a[8]=e=>re.script=e),class:"w-full",rows:"20"},null,8,["modelValue"])])):(0,s.Q3)("",!0)])),_:1})])),_:1})}}});const me=re;var pe=me}}]);
//# sourceMappingURL=278.66e301a8.js.map
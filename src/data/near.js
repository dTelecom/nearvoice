import * as nearAPI from "near-api-js";
import { singletonHook } from "react-singleton-hook";
import { useEffect, useState } from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupNeth } from "@near-wallet-selector/neth";

export const NearConfig = {
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.near.org",
  archivalNodeUrl: "https://rpc.mainnet.internal.near.org",
  contractName: "social.near",
  walletUrl: "https://wallet.near.org",
};

export const LsKey = NearConfig.contractName + ":v01:";

async function accountState(near, accountId) {
  const account = new nearAPI.Account(
    near.nearConnection.connection,
    accountId
  );
  return await account.state();
}

function setupContract(near, contractId, options) {
  const { viewMethods = [] } = options;
  const contract = {
    near,
    contractId,
  };
  viewMethods.forEach((methodName) => {
    contract[methodName] = (args) =>
      near.viewCall(contractId, methodName, args);
  });
  return contract;
}

async function viewCall(
  provider,
  blockId,
  contractId,
  methodName,
  args,
  finality
) {
  args = args || {};
  const result = await provider.query({
    request_type: "call_function",
    account_id: contractId,
    method_name: methodName,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    block_id: blockId,
    finality,
  });

  return (
    result.result &&
    result.result.length > 0 &&
    JSON.parse(Buffer.from(result.result).toString())
  );
}

async function _initNear() {
  const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
  const selector = setupWalletSelector({
    network: "mainnet",
    modules: [
      setupNearWallet(),
      setupMyNearWallet(),
      setupSender(),
      setupHereWallet(),
      setupMeteorWallet(),
      setupNeth({
        gas: "300000000000000",
        bundle: false,
      }),
    ],
  });

  const nearConnection = await nearAPI.connect(
    Object.assign({ deps: { keyStore } }, NearConfig)
  );

  const _near = {};
  _near.selector = selector;

  _near.nearArchivalConnection = nearAPI.Connection.fromConfig({
    networkId: NearConfig.networkId,
    provider: {
      type: "JsonRpcProvider",
      args: { url: NearConfig.archivalNodeUrl },
    },
    signer: { type: "InMemorySigner", keyStore },
  });

  _near.keyStore = keyStore;
  _near.nearConnection = nearConnection;

  const transformBlockId = (blockId) =>
    blockId === "optimistic" || blockId === "final"
      ? {
          finality: blockId,
          blockId: undefined,
        }
      : blockId !== undefined && blockId !== null
      ? {
          finality: undefined,
          blockId: parseInt(blockId),
        }
      : {
          finality: "optimistic",
          blockId: undefined,
        };

  _near.viewCall = (contractId, methodName, args, blockHeightOrFinality) => {
    const { blockId, finality } = transformBlockId(blockHeightOrFinality);
    const nearViewCall = () =>
      viewCall(
        blockId
          ? _near.nearArchivalConnection.provider
          : _near.nearConnection.connection.provider,
        blockId ?? undefined,
        contractId,
        methodName,
        args,
        finality
      );

    return nearViewCall();
  };

  _near.block = (blockHeightOrFinality) => {
    const blockQuery = transformBlockId(blockHeightOrFinality);
    const provider = blockQuery.blockId
      ? _near.nearArchivalConnection.provider
      : _near.nearConnection.connection.provider;
    return provider.block(blockQuery);
  };

  _near.contract = setupContract(_near, NearConfig.contractName, {
    viewMethods: [
      "storage_balance_of",
      "get",
      "get_num_accounts",
      "get_accounts_paged",
      "is_write_permission_granted",
      "keys",
    ],
    changeMethods: [],
  });

  _near.accountState = (accountId) => accountState(_near, accountId);

  return _near;
}

const defaultNearPromise = Promise.resolve(_initNear());
export const useNearPromise = singletonHook(defaultNearPromise, () => {
  return defaultNearPromise;
});

const defaultNear = null;
export const useNear = singletonHook(defaultNear, () => {
  const [near, setNear] = useState(defaultNear);
  const _near = useNearPromise();

  useEffect(() => {
    _near.then(setNear);
  }, [_near]);

  return near;
});

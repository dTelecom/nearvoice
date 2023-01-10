import React, { useState, useEffect, useCallback } from "react";
import Input from "./Home/Input";
import JoinButton from "./Home/JoinButton";
import ConnectButton from "./Home/ConnectButton";
import LogOutButton from "./Home/LogOutButton";
import Avatar from "boring-avatars";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "@near-wallet-selector/modal-ui/styles.css";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { NearConfig, useNear } from "../data/near";
import { useAccount } from "../data/account";

const Join = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const { sid } = useParams();

  const joinRoom = async () => {
    if (!near) {
      return;
    }

    let url = "https://app.dmeet.org/api/room/join";
    let data = {};
    data.name = username;
    data.noPublish = false;
    data.sid = sid;
    const response = await axios.post(url, data);
    console.log(response);

    navigate(`/room/${response.data.sid}`, { state: response.data });
  };

  const [signedIn, setSignedIn] = useState(false);
  const [signedAccountId, setSignedAccountId] = useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [profile, setProfile] = useState(null);
  const [nameDisabled, setNameDisabled] = useState(false);

  const near = useNear();
  const account = useAccount();
  const accountId = account.accountId;

  useEffect(() => {
    if (!near) {
      return;
    }
    near.selector.then((selector) => {
      setWalletModal(
        setupModal(selector, { contractId: NearConfig.contractName })
      );
    });
  }, [near]);

  const requestSignIn = useCallback(
    (e) => {
      e && e.preventDefault();
      walletModal.show();
      return false;
    },
    [walletModal]
  );

  const logOut = useCallback(async () => {
    if (!near) {
      return;
    }
    const wallet = await (await near.selector).wallet();
    wallet.signOut();
    near.accountId = null;
    setSignedIn(false);
    setSignedAccountId(null);
  }, [near]);

  useEffect(() => {
    if (!near) {
      return;
    }
    setSignedIn(!!accountId);
    setSignedAccountId(accountId);
  }, [near, accountId]);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    fetchProfile();
  }, [signedIn]);

  const fetchProfile = async () => {
    let keys = [`${signedAccountId}/profile`];
    keys = keys.map((key) => `${key}/**`);
    const options = undefined;
    const args = {
      keys,
      options,
    };

    let data = await near.viewCall(
      NearConfig.contractName,
      "get",
      args,
      undefined
    );
    if (keys.length === 1) {
      const parts = keys[0].split("/");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "*" || part === "**") {
          break;
        }
        data = data?.[part];
      }
    }
    setProfile(data);
  };

  useEffect(() => {
    if (!profile) {
      return;
    }
    setUsername(profile.name);
    setNameDisabled(true);
  }, [profile]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {signedIn ? (
        <>
          <Avatar size={120} name={username} />
          <Input state={{ username, setUsername }} disabled={nameDisabled} />
          <JoinButton onClick={joinRoom} />
          <LogOutButton onClick={(e) => logOut(e)} />
        </>
      ) : (
        <ConnectButton onClick={(e) => requestSignIn(e)} />
      )}
    </div>
  );
};

export default Join;

import React from "react";
import UserTile from "./UserTile";
import UserWrapper from "./UserWrapper";
import UserInfo from "./UserInfo";

const User = ({ peer, audioMuted }) => {
  return (
    <UserTile>
      <UserWrapper level={peer.level}>
        <UserInfo peer={peer} />
      </UserWrapper>
    </UserTile>
  );
};

export default User;

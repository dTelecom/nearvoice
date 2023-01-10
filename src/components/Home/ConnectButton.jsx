import React from "react";

const ConnectButton = ({ onClick, disabled }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick()}
      className="px-6 py-3 w-80 bg-brand-100 text-white font-bold hover:opacity-80 rounded-3xl border-none focus:ring-1 ring-brand-100 outline-none disabled:opacity-25"
    >
      Connect Wallet
    </button>
  );
};

export default ConnectButton;

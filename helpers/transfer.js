const {
  Address,
  internal,
  SendMode,
  toNano,
  WalletContractV5R1,
  TonClient,
} = require("@ton/ton");
const { mnemonicToWalletKey } = require("@ton/crypto");
const httpUrl = "https://toncenter.com/api/v2/jsonRPC";
require("dotenv/config");

module.exports = transfer = async (recieverAddress, amountInTon) => {
  const tonClient = new TonClient({
    endpoint: httpUrl,
    apiKey: process.env.TON_API_KEY,
  });

  const toAddress = Address.parse(recieverAddress);
  try {
    const MNEMONICS = process.env.MNEMONICS.split(" ");

    const keyPair = await mnemonicToWalletKey(MNEMONICS);

    const wallet = WalletContractV5R1.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
    });
    const walletContract = tonClient.open(wallet);

    const seqno = await walletContract.getSeqno();

    let a = await walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY,

      messages: [
        internal({
          to: toAddress,
          value: toNano(amountInTon),
        }),
      ],
    });

    console.log(`Sent ${amountInTon} to ${recieverAddress}`)

    console.log(a);
  } catch (error) {
    console.log("Transfer error:", error);
  }
};

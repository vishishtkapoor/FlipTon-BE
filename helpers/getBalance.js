
const { WalletContractV4, TonClient, fromNano }=  require("@ton/ton") ;
const { getHttpEndpoint }=  require("@orbs-network/ton-access") ;

module.exports = getBalance = async (walletAddress) => {
    try {
    // initialize ton rpc client on testnet
      const endpoint = await getHttpEndpoint({ network: "mainnet" }); // for mainnet { network: "mainnet" }
      const client = new TonClient({ endpoint });
      const balance = await client.getBalance(walletAddress);
      return fromNano(balance);
    } catch (error) {
      console.log(error)
       console.log(error);   
 }
  };
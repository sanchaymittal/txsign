import React from "react";
import Biconomy from "@biconomy/mexa";

const mana = require("./FakeMana.json");
const Web3 = require("web3");

let sigUtil = require("eth-sig-util");

const contractAddress = "0x2A3df21E612d30Ac0CD63C3F80E1eB583A4744cC";   // Please add your deployed contract address here
const biconomyAPIKey = 'ikQjlEoSU.ee81d9e3-f295-4ec7-8415-4f3d48b298ce';  // add your api  key from the dashboard

const parentChainId = '1'; // chain id of the network tx is signed on
const maticProvider = 'https://testnetv3.matic.network'

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" },
  { name: "functionSignature", type: "bytes" }
];

let domainData = {
  name: "FAKEMana",
  version: "1",
  chainId: parentChainId,
  verifyingContract: contractAddress
};

window.ethereum.enable().catch(error => {
  console.log(error);
});

const web3 = new Web3(window.ethereum);
const biconomy = new Biconomy(
 new Web3.providers.HttpProvider(maticProvider),
  {
    apiKey: biconomyAPIKey,   
    debug: true
  }
);
const getWeb3 = new Web3(biconomy);

biconomy
  .onEvent(biconomy.READY, () => {
    // Initialize your dapp here like getting user accounts etc
    console.log("Mexa is Ready");
  })
  .onEvent(biconomy.ERROR, (error, message) => {
    // Handle error while initializing mexa
    console.error(error);
  });

const contract = new getWeb3.eth.Contract(mana, contractAddress);
const amount = "1000000000000000000";
const sender = "0x75e4DD0587663Fce5B2D9aF7fbED3AC54342d3dB";
const recipient = "0xBDC6bb454C62E64f13FA2876F78cdAfA20089204"; 
const spender = "0x5C66D24105D1d5F0E712B47C75c8ed6b6a00c3C5";

const metaTransfer = async () => {
  const accounts = await web3.eth.getAccounts();
  let userAddress = accounts[0];
  console.log(await contract.methods.balanceOf(userAddress).call())
  let functionSignature = contract.methods
    .transfer(recipient, amount)
    .encodeABI();
  executeMetaTransaction(functionSignature);
};

const metaApprove = async () => {
  const accounts = await web3.eth.getAccounts();
  let userAddress = accounts[0];
  console.log(await contract.methods.balanceOf(userAddress).call())
  let functionSignature = contract.methods
    .approve(spender, amount)
    .encodeABI();
  executeMetaTransaction(functionSignature);
};

const metaTransferFrom = async () => {
  const accounts = await web3.eth.getAccounts();
  let userAddress = accounts[0];
  console.log(await contract.methods.balanceOf(userAddress).call())
  let functionSignature = contract.methods
    .transferFrom(sender,recipient, amount)
    .encodeABI();
  executeMetaTransaction(functionSignature); 
};

const allowance = async () => {
  let functionSignature = await contract.methods
    .allowance(sender,spender)
    .call();
    console.log(functionSignature);
}
const executeMetaTransaction = async functionSignature => {
    const accounts = await web3.eth.getAccounts();
    let userAddress = accounts[0];
    let nonce = await contract.methods.getNonce(userAddress).call();

    let message = {};
    message.nonce = parseInt(nonce);
    message.from = userAddress;
    message.functionSignature = functionSignature;

    const dataToSign = JSON.stringify({
      types: {
        EIP712Domain: domainType,
        MetaTransaction: metaTransactionType
      },
      domain: domainData,
      primaryType: "MetaTransaction",
      message: message
    });
    console.log(domainData);
    console.log(userAddress)
    web3.eth.currentProvider.send(
      {
        jsonrpc: "2.0",
        id: 999999999999,
        method: "eth_signTypedData_v4",
        params: [userAddress, dataToSign]
      },
      async function(error, response) {
        console.info(`User signature is ${response.result}`);

        let { r, s, v } = getSignatureParameters(response.result);
				
				// logging output
        console.log(userAddress);
        console.log(JSON.stringify(message));
        console.log(message);
        console.log(getSignatureParameters(response.result));

        const recovered = sigUtil.recoverTypedSignature_v4({
          data: JSON.parse(dataToSign),
          sig: response.result
        });
        console.log(`Recovered ${recovered}`);
        let tx = await contract.methods
          .executeMetaTransaction(userAddress, functionSignature, r, s, v)
          .send({
            from: userAddress
          });
          console.log(tx, await contract.methods.balanceOf(userAddress).call())
      }
    );
  };

  const getSignatureParameters = signature => {
    if (!web3.utils.isHexStrict(signature)) {
      throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
      );
    }
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v = "0x".concat(signature.slice(130, 132));
    v = web3.utils.hexToNumber(v);
    if (![27, 28].includes(v)) v += 27;
    return {
      r: r,
      s: s,
      v: v
    };
  };

  // client/src/App.js

function App() {
  return (
    <div>
      <h3> MetaToken </h3>
        <React.Fragment>
          {""}
          <button onClick={() => metaTransfer()} size="small">
            Transfer
          </button>
          <button onClick={() => metaApprove()} size="small">
            Approve
          </button>
          <button onClick={() => metaTransferFrom()} size="small">
            Transfer From
          </button>
          <button onClick={() => allowance()} size="small">
            Allowance
          </button>
        </React.Fragment>
    </div>
  );
}

export default App;
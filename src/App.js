// client/src/App.js
import React, { useState, useEffect, useCallback } from "react";
import Biconomy from "@biconomy/mexa";
import abi from "./MTToken.json";
import counterJSON from "./SignTest.json";
let sigUtil = require("eth-sig-util");

function App() {
  const Web3 = require("web3");

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
    name: "MetaToken",
    version: "1",
    chainId: "3",
    verifyingContract: "0x398da9088fecAe7C38CE76d98b09d08c9aD38B2E"
  };
  // const rpcURL = ;
  // const web3 = new Web3(rpcURL);

  window.ethereum.enable().catch(error => {
    console.log(error);
  });

  const web3 = new Web3(window.ethereum);
  const biconomy = new Biconomy(
    new Web3.providers.HttpProvider("https://testnetv3.matic.network"),
    {
      dappId: "5e82f9056cf1a06763b686e4",
      apiKey: "yhgD9_k2A.a88e1bb4-056c-4bb0-ac52-5d917ce8c7bc",
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
    });

  const [counterInstance, setCounterInstance] = useState(undefined);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [count, setCount] = useState(0);
  const metaTokenAddress = "0x398da9088fecAe7C38CE76d98b09d08c9aD38B2E";
  const contract = new getWeb3.eth.Contract(abi, metaTokenAddress);
  const amount = "1000000000000000000";
  const recipient = "0x5C66D24105D1d5F0E712B47C75c8ed6b6a00c3C5";
  const account = async () => {
    const accounts = await web3.eth.getAccounts();
    setSelectedAddress(accounts);
  };

  if (!counterInstance) {
    const contractAddress = "0xc766a047613e308121f5233a0d3df385aafc3f29";
    const instance = new getWeb3.eth.Contract(counterJSON, contractAddress);
    setCounterInstance(instance);
  }

  const getCount = useCallback(async () => {
    if (counterInstance) {
      // Get the value from the contract to prove it worked.
      const response = await counterInstance.methods.value().call();
      // Update state with the result.
      setCount(response);
    }
  }, [counterInstance]);

  useEffect(() => {
    getCount();
  }, [counterInstance, getCount, account]);

  const increase = async () => {
    const accounts = await web3.eth.getAccounts();
    await signTransaction(accounts[0]).then(async () => {
      await counterInstance.methods.increase().send({ from: accounts[0] });
    });
    getCount();
  };

  const normalTransfer = async () => {
    const accounts = await web3.eth.getAccounts();
    let userAddress = accounts[0];
    const contractTest = new web3.eth.Contract(abi, metaTokenAddress);
    await contractTest.methods
      .transfer(recipient, amount)
      .send({ from: userAddress });
  };

  const metaTransfer = async () => {
    let functionSignature = contract.methods
      .metaTransfer(recipient, amount)
      .encodeABI();
    executeMetaTransaction(functionSignature);
  };

  const metaApprove = async () => {
    const accounts = await web3.eth.getAccounts();
    let userAddress = accounts[0];
    let functionSignature = contract.methods
      .metaApprove(userAddress, amount)
      .encodeABI();
    executeMetaTransaction(functionSignature);
  };

  const metaTransferFrom = async () => {
    const accounts = await web3.eth.getAccounts();
    let userAddress = accounts[0];
    let functionSignature = contract.methods
      .metaTransferFrom(userAddress, recipient, amount)
      .encodeABI();
    executeMetaTransaction(functionSignature);
  };

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
    console.log();
    console.log(userAddress)
    web3.eth.currentProvider.send(
      {
        jsonrpc: "2.0",
        id: 999999999999,
        method: "eth_signTypedData_v4",
        params: [userAddress, dataToSign]
      },
      function(error, response) {
        console.info(`User signature is ${response.result}`);
        let { r, s, v } = getSignatureParameters(response.result);
        console.log(userAddress);
        console.log(JSON.stringify(message));
        console.log(message);
        console.log(getSignatureParameters(response.result));

        const recovered = sigUtil.recoverTypedSignature_v4({
          data: JSON.parse(dataToSign),
          sig: response.result
        });
        console.log(`Recovered ${recovered}`);
        let tx = contract.methods
          .executeMetaTransaction(userAddress, functionSignature, r, s, v)
          .send({
            from: userAddress
          });
        console.log(tx);
      }
    );
  };

  const signTransaction = async from => {
    const data = "Hi you are incrementing thevalue";
    const receipt = await web3.eth.sign(data, from, function(error, result) {
      if (!error) console.log(JSON.stringify(result));
      else console.error(error);
    });
    return receipt;
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

  return (
    <div>
      <h3> Counter counterInstance </h3>
      {!counterInstance && (
        <React.Fragment>
          <div>Contract Instance or network not loaded.</div>
        </React.Fragment>
      )}
      {counterInstance && (
        <React.Fragment>
          <div>
            <div>Counter Value:</div>
            <div>{count}</div>
          </div>
          <div>Counter Actions</div>
          <button onClick={() => increase()} size="small">
            Increase Counter by 1
          </button>
          <div>Meta Token</div>
          <button onClick={() => normalTransfer()} size="small">
            Normal Transfer
          </button>
          {""}
          <button onClick={() => metaTransfer()} size="small">
            Meta Transfer
          </button>
          {""}
          <button onClick={() => metaApprove()} size="small">
            Meta Approve
          </button>
          {""}
          <button onClick={() => metaTransferFrom()} size="small">
            Meta TransferFrom
          </button>
        </React.Fragment>
      )}
    </div>
  );
}

export default App;

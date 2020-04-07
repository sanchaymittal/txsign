// client/src/App.js
import React, { useState, useEffect, useCallback } from "react";
import Biconomy from "@biconomy/mexa";
import abi2 from "./MTToken.json";
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
    chainId: "15001",
    verifyingContract: "0xc766a047613e308121f5233a0d3df385aafc3f29"
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

  const counterJSON = [
    {
      constant: false,
      inputs: [],
      name: "increase",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "value",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    }
  ];

  const signTransaction = async from => {
    const data = "HI you are incrementing thevalue";
    const receipt = await web3.eth.sign(data, from, function(error, result) {
      if (!error) console.log(JSON.stringify(result));
      else console.error(error);
    });
    return receipt;
  };

  const [counterInstance, setCounterInstance] = useState(undefined);

  if (!counterInstance) {
    const contractAddress = "0xc766a047613e308121f5233a0d3df385aafc3f29";
    const instance = new getWeb3.eth.Contract(counterJSON, contractAddress);
    setCounterInstance(instance);
  }

  const [count, setCount] = useState(0);

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
  }, [counterInstance, getCount]);

  const increase = async () => {
    const accounts = await web3.eth.getAccounts();
    // await signTransaction(accounts[0]).then( async() => {
    await counterInstance.methods.increase().send({ from: accounts[0] });
    // })
    getCount();
  };

  // const approve = async () => {
  //   const amount = "1000000000000000000"
  //   const metaTokenAddress = "0x81f419dd0990AbB4bc32aCF5982e702cB9A0163C"
  //   const accounts = await web3.eth.getAccounts();
  //   console.log(accounts);
  //   const metaToken = new getWeb3.eth.Contract(abi, metaTokenAddress);
  //   await metaToken.methods.metaApprove(accounts[1], amount).send({ from: accounts[0] });
  // }

  // const transfer = async () => {
  //   const amount = "1000000000000000000"
  //   const accounts = await web3.eth.getAccounts();
  //   const metaTokenAddress = "0x81f419dd0990AbB4bc32aCF5982e702cB9A0163C"
  //   const metaToken = new getWeb3.eth.Contract(abi, metaTokenAddress);
  //   const recipient = "0x5C66D24105D1d5F0E712B47C75c8ed6b6a00c3C5"
  //   await metaToken.methods.metaTransferFrom(accounts[0],recipient, amount).send({ from: accounts[0] });
  // }

  const transfer = async () => {
    const amount = "1000000000000000000";
    const recipient = "0x5C66D24105D1d5F0E712B47C75c8ed6b6a00c3C5";
    const metaTokenAddress = "0x569f9AC554216B926975F7dEd9Bd4F8b33BD3e3c";
    const accounts = await web3.eth.getAccounts();

    let userAddress = accounts[0];
    const contract = new getWeb3.eth.Contract(abi2, metaTokenAddress);
    let nonce = await contract.methods.getNonce(userAddress).call();
    let functionSignature = contract.methods
      .transfer(recipient, amount)
      .encodeABI();

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
  web3.currentProvider.send(
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
    }
  );
  }

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
          <div>Transfer Token</div>
          {/* <button onClick={() => approve()} size="small">
            Approve
          </button> */}
          <button onClick={() => transfer()} size="small">
            Transfer
          </button>
        </React.Fragment>
      )}
    </div>
  );
}

export default App;

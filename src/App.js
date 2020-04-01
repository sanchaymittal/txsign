// client/src/App.js
import React, { useState, useEffect, useCallback } from "react";
import Biconomy from "@biconomy/mexa";

function App() {
  const Web3 = require("web3");
  // const rpcURL = ;
  // const web3 = new Web3(rpcURL);
 
  window.ethereum.enable().catch(error => {
    console.log(error);
  });
  
  const getWeb3 = new Web3(window.ethereum);
  const biconomy = new Biconomy(new Web3.providers.HttpProvider("https://testnetv3.matic.network"),{dappId: "5e82f9056cf1a06763b686e4", apiKey: "yhgD9_k2A.a88e1bb4-056c-4bb0-ac52-5d917ce8c7bc", "debug": true});

  const web3 = new Web3(biconomy);

  biconomy.onEvent(biconomy.READY, () => {
    // Initialize your dapp here like getting user accounts etc
    console.log("Mexa is Ready")
  }).onEvent(biconomy.ERROR, (error, message) => {
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

  const [counterInstance, setCounterInstance] = useState(undefined);

  if (!counterInstance) {
    const contractAddress = "0xc766a047613e308121f5233a0d3df385aafc3f29";
    const instance = new web3.eth.Contract(counterJSON, contractAddress);
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
    const accounts = await getWeb3.eth.getAccounts();
    await counterInstance.methods.increase().send({from:accounts[0]});
    getCount();
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
        </React.Fragment>
      )}
    </div>
  );
}

export default App;

// client/src/App.js
// import React, { useState, useEffect, useCallback } from "react";
const Web3 = require('web3')
const rpcURL = "https://testnetv3.matic.network"
const web3 = new Web3(rpcURL)
const address = '0x9fB29AAc15b9A4B7F17c3385939b007540f4d791'
// web3.eth.getBalance(address, (err, wei) => {
//   balance = web3.utils.fromWei(wei, 'ether')
// }).then((balance) => console.log(balance));

  const contractAddress = "0xc766A047613e308121f5233A0d3DF385aAFc3F29";
  const abi = [
    {
      "constant": false,
      "inputs": [],
      "name": "increase",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "value",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ]
const contract = new web3.eth.Contract(
  abi,
  contractAddress
);


const getCount = (async () => {
  // if (counterInstance) {
    // Get the value from the contract to prove it worked.
    const response = await contract.methods.value().call();
    // Update state with the result.
    console.log(response);
    // setCount(response);
});

getCount();

const increase = async (userAddress) => {
  await contract.methods.increase().send({from: userAddress});
  getCount();
};
//   const accounts = "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07";
//   // const [counterInstance, setCounterInstance] = useState(undefined);
//   const contractAddress = "0xc766A047613e308121f5233A0d3DF385aAFc3F29";
//   const contract = new web3.eth.Contract(
//     SignTest,
//     contractAddress
//   );
//   // console.log(contract.methods.value().call());
//   // setCounterInstance(contract);

//   const [count, setCount] = useState(0);

//   const getCount = useCallback(async () => {
//     // if (counterInstance) {
//       // Get the value from the contract to prove it worked.
//       const response = await contract.methods.value().call();
//       // Update state with the result.
//       // setCount(response);
//   });

//   // useEffect(() => {
//   //   getCount();
//   // }, [counterInstance, getCount]);

//   const increase = async (userAddress) => {
//     await contract.methods.increase().send({from: userAddress});
//     getCount();
//   };


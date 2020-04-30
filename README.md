# Network Agnostic Transaction Signing using Biconomy

### Goal:

- Execute transactions on Matic chain, without changing provider on Metamask (this tutorial caters to metamask's inpage provider, can be modified to execute transactions from any other provider)
- Under the hood, user signs on an intent to execute a transaction, which is relayed by Biconomy's relayers to execute it on a contract deployed on Matic chain.

### Installations (prerequisites)

1. `nodejs`  > v `11.0.0`
2. `truffle` 

    ```bash
    npm install -g truffle
    ```

### Setup

1. Clone a boilerplate frontend

    ```bash
    npx create-react-app txsign
    cd txsign
    ```

2. For contract development (inside `/txsign` dir)

    ```bash
    truffle init
    ```

3. Install dependencies (inside `/txsign` dir)

    ```bash
    yarn add @biconomy/mexa @openzeppelin/contracts truffle-hdwallet-provider eth-sig-util
    ```

## Contracts

Import EIP712 signature implementation to your contract. Below is the tutorial implementation for a ERC20 token.

Go to contracts dir

```bash
cd contracts
```

Create a new directory `lib` and create a new file named `EIP712Base.sol`

Dir hierarchy: `txSign > contracts > lib > EIP712Base.sol`

```jsx
pragma solidity >=0.4.21 <0.7.0;

contract EIP712Base {

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH = keccak256(bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));

    bytes32 internal domainSeperator;

    constructor(string memory name, string memory version) public {
      domainSeperator = keccak256(abi.encode(
			EIP712_DOMAIN_TYPEHASH,
			keccak256(bytes(name)),
			keccak256(bytes(version)),
			getChainID(),
			address(this)
		));
    }

    function getChainID() internal pure returns (uint256 id) {
		assembly {
			id := 1
		}
	}

    function getDomainSeperator() private view returns(bytes32) {
		return domainSeperator;
	}

    /**
    * Accept message hash and returns hash message in EIP712 compatible form
    * So that it can be used to recover signer from signature signed using EIP712 formatted data
    * https://eips.ethereum.org/EIPS/eip-712
    * "\\x19" makes the encoding deterministic
    * "\\x01" is the version byte to make it compatible to EIP-191
    */
    function toTypedMessageHash(bytes32 messageHash) internal view returns(bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", getDomainSeperator(), messageHash));
    }

}
```

In the above code for the function `getChainID`, edit chain id to the one user's wallet is connected to 

```bash
function getChainID() internal pure returns (uint256 id) {
		assembly {
			id := 1
		}
```

Here the chainId is defined for Mainnet, So that the signature can be generated on mainnet and relayed to matic.

Create another file in `contracts/`, named  `EIP712MetaTransaction.sol`

Dir hierarchy: `txSign > contracts > EIP712MetaTransaction.sol`

```jsx
pragma solidity >=0.4.21 <0.7.0;

import "./lib/EIP712Base.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract EIP712MetaTransaction is EIP712Base {
    using SafeMath for uint256;
    bytes32 private constant META_TRANSACTION_TYPEHASH = keccak256(
        bytes(
            "MetaTransaction(uint256 nonce,address from,bytes functionSignature)"
        )
    );

    event MetaTransactionExecuted(
        address userAddress,
        address payable relayerAddress,
        bytes functionSignature
    );
    mapping(address => uint256) nonces;

    /*
     * Meta transaction structure.
     * No point of including value field here as if user is doing value transfer then he has the funds to pay for gas
     * He should call the desired function directly in that case.
     */
    struct MetaTransaction {
        uint256 nonce;
        address from;
        bytes functionSignature;
    }

    constructor(string memory name, string memory version)
        public
        EIP712Base(name, version)
    {}

    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public payable returns (bytes memory) {
        MetaTransaction memory metaTx = MetaTransaction({
            nonce: nonces[userAddress],
            from: userAddress,
            functionSignature: functionSignature
        });
        require(
            verify(userAddress, metaTx, sigR, sigS, sigV),
            "Signer and signature do not match"
        );
        // Append userAddress and relayer address at the end to extract it from calling context
        (bool success, bytes memory returnData) = address(this).call(
            abi.encodePacked(functionSignature, userAddress, msg.sender)
        );

        require(success, "Function call not successfull");
        nonces[userAddress] = nonces[userAddress].add(1);
        emit MetaTransactionExecuted(
            userAddress,
            msg.sender,
            functionSignature
        );
        return returnData;
    }

    function hashMetaTransaction(MetaTransaction memory metaTx)
        internal
        view
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    META_TRANSACTION_TYPEHASH,
                    metaTx.nonce,
                    metaTx.from,
                    keccak256(metaTx.functionSignature)
                )
            );
    }

    function getNonce(address user) public view returns (uint256 nonce) {
        nonce = nonces[user];
    }

    function verify(
        address signer,
        MetaTransaction memory metaTx,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) internal view returns (bool) {
        return
            signer ==
            ecrecover(
                toTypedMessageHash(hashMetaTransaction(metaTx)),
                sigV,
                sigR,
                sigS
            );
    }

    function _msgSender() internal view returns (address payable) {
        if (msg.sender == address(this)) {
            bytes20 userAddress;
            bytes memory data = msg.data;
            uint256 dataLength = msg.data.length;
            assembly {
                calldatacopy(0x0, sub(dataLength, 40), sub(dataLength, 20))
                userAddress := mload(0x0)
            }
            return address(uint160(userAddress));
        } else {
            return msg.sender;
        }
    }

    function msgRelayer() internal view returns (address relayer) {
        if (msg.sender == address(this)) {
            bytes20 relayerAddress;
            bytes memory data = msg.data;
            uint256 dataLength = msg.data.length;
            assembly {
                calldatacopy(0x0, sub(dataLength, 20), dataLength)
                relayerAddress := mload(0x0)
            }
            relayer = address(uint160(relayerAddress));
        }
    }

    // To recieve ether in contract
    fallback() external payable {}
}
```

Create a new file `MetaToken.sol`

This is the contract that user will be interacting with

```jsx
pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "./EIP712MetaTransaction.sol";

contract MetaToken is ERC20, ERC20Detailed, EIP712MetaTransaction {
    uint256 public initialSupply = 100000000000000000000;

    constructor()
        public
        ERC20Detailed("META", "MT", 18)
        EIP712MetaTransaction("MetaToken", "1")
    {
        _mint(msg.sender, initialSupply);
    }
		
		// helper function
		function mint(uint256 supply) 
				public
		{
				_mint(msg.sender, supply);
		}
}
```

In above constructor,

`ERC20Detailed("META", "META", 18)`

- param: ERC20Detailed(name, symbol, decimals)

 `EIP712MetaTransaction("MetaToken", "1")`

- param: EIP712MetaTransaction(Name, Version)
- Note: Name and Version are important params as they are fields which are encrypted to recognise the signature message.

## Contract Deployment Setup

Now go to the `migrations/` dir and create a new file `2_deploy_contracts.js`

```jsx
const MetaToken = artifacts.require("MetaToken");

module.exports = async function(deployer) {
  deployer.deploy(MetaToken);
};
```

`truffle-config.js` file

```jsx
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();
// const mnemonic = 'Or paste you mnemonic here'

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },
    matic: {
      provider: () => new HDWalletProvider(mnemonic, `https://testnetv3.matic.network`),
      network_id: 15001,
      gasPrice: '0x0',
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
    }
  }
}
```

mnemonic are seed words generated for a wallet. information regarding mnemonic shouldn't be shared with others. Therefore, create a `.secret` file and paste you seed words in it. If you are new wallet, mnemonic or metamask. Go through the metamask tutorial series to create you account and get familiar with it.

## Compile and Deploy

```jsx
truffle compile
truffle migrate --network matic
```

There will be build folder created for the deployed contracts.

Please secure or copy the contract address generated for MetaToken.sol contract deployment and store it. we will use it in a while.

## Register contract in Biconomy

1. Let's Register our contracts to biconomy dashboard
    1. Visit the [official documents of biconomy](https://docs.biconomy.io/biconomy-dashboard).
    2. While registering the dapp, select `Matic Testnet 3`
2. Copy the`API key` to use in frontend
3. And Add function `executeMetaTransaction` in Manage-Api and make sure to enable meta-tx. (Check 'native-metatx' option)

## Front-End

1. To get the contract abi file, copy it from the build dir from root. And paste it inside Src dir.
2. Go to `src > App.js`

And replace the existing file with this one 

`App.js`

1. Add necessary imports

    ```jsx
    // client/src/App.js
    import React from "react";
    import Biconomy from "@biconomy/mexa";
    ```

2. Initialize constants

    ```jsx
    const abi = require("./MetaToken.json").abi;
    const Web3 = require("web3");

    const sigUtil = require("eth-sig-util");

    const contractAddress = "0x";   // Please add your deployed contract address here
    const biconomyAPIKey = '';  // add your api  key from the dashboard

    const parentChainId = ''; // chain id of the network tx is signed on
    const maticProvider = 'https://testnetv3.matic.network'
    ```

3. Define EIP712 domain params

    ```jsx
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
        chainId: parentChainId,
        verifyingContract: contractAddress
      };
    ```

4. Enable metamask & initialize Web3 providers (metamask inpage provider for `web3` and biconomy provider for `getWeb3`)

    ```jsx
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
    ```

5. Initialize contract object and define params 

    ```jsx
    const contract = new getWeb3.eth.Contract(abi, contractAddress);
    const amount = "1000000000000000000";
    const recipient = "Add your recipient address here";  
    ```

6. Define functions to execute the transaction

    ```jsx
    const metaTransfer = async () => {
      let functionSignature = contract.methods
        .transfer(recipient, amount)
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
            let tx = contract.methods
              .executeMetaTransaction(userAddress, functionSignature, r, s, v)
              .send({
                from: userAddress
              });
            console.log(tx);
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
    ```

7. Define `App()` function

    ```jsx
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
            </React.Fragment>
        </div>
      );
    }

    export default App;
    ```

### Run your application 🎉

```jsx
yarn start
```

- Connect to your Metamask
- Stay on Mainnet RPC
- And interact with the transactions
- You can check the console for the transaction hash or any other logging info.
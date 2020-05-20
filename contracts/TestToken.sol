pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20, EIP712MetaTransaction {
     uint256 public initialSupply = 100000000000000000000;
    
    constructor() ERC20("Test", "TST")  EIP712MetaTransaction("TestToken", "1") public {
        _mint(msg.sender, initialSupply);
    }
    
		function mint(uint256 supply) 
				public
		{
				_mint(msg.sender, supply);
		}
}
pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "./EIP712MetaTransaction.sol";

contract MetaToken is ERC20, ERC20Detailed, EIP712MetaTransaction {
    uint256 public initialSupply = 100000000000000000000;

    constructor()
        public
        ERC20Detailed("DEMO", "DM", 18)
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
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./FlashloanPool.sol";
import "./OpenZeppelin/token/ERC20/ERC20.sol";

contract LoanReceiver {
    
    address payable private owner;
    address private poolForLoan;

    constructor (address _pool) {        
        owner = payable(msg.sender);     
        poolForLoan = _pool;
    }        

    // 1. After deploy we execute function which call flashloan function from pool
    function executeFlashLoan(uint amount) external {
        require(msg.sender == owner, "Only owner can execute flash loan");                         
        uint256 param1 = 100;
        uint256 param2 = 15;
        bytes memory parameters = abi.encode(param1, param2);
        FlashloanPool(poolForLoan).flashloan(payable(address(this)), amount, parameters);    
    }

    // 2. Flashloan function from pool invoke function from our contract with standard signature
    function executeOperation(address sender, address underlying, uint amount, uint fee, bytes calldata params) external returns (uint) {       
        uint err = 0;
        (uint256 param1, uint256 param2) = abi.decode(params, (uint256, uint256));                   
        IERC20(underlying).transfer(poolForLoan, amount);
        IERC20(underlying).transferFrom(owner, poolForLoan, fee);
        return err;
    }    
}
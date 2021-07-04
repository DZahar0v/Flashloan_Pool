// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./OpenZeppelin/token/ERC20/IERC20.sol";
import "./OpenZeppelin/token/ERC20/ERC20.sol";
import "./OpenZeppelin/security/ReentrancyGuard.sol";
import "./Utils/SafeTransfer.sol";

interface IFlashloanReceiver {
    function executeOperation(address sender, address underlying, uint amount, uint fee, bytes calldata params) external;
}

contract FlashloanPool is ERC20, SafeTransfer, ReentrancyGuard {

    struct DepositSnapshot {        
        uint256 time;
        bool exist;
    }

    mapping (address => DepositSnapshot) public depositors;    
    address public admin;
    address public token;
    uint256 internal constant poolFee = 100; // 10% => 30/1000
    uint256 internal constant adminFee = 1;  // 0.1% => 1/1000         
    uint256 public totalBalance;
    uint256 public adminBalance;  

    event Deposit(address indexed depositer, uint256 amount);
    event Withdraw(address indexed withdrawer, uint256 amount);
    event GetTreasure(address indexed user, uint256 treasure);
    event Flashloan(address indexed receiver, uint256 amount, uint256 totalFee);

    constructor(address _token) ERC20("zToken", "ZTK") {
        require(_token != address(0), "Incorrect address of pool token");
        admin = msg.sender;
        token = _token;
    }

    function deposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Zero deposit not allowed");
        if (!depositors[msg.sender].exist) {            
            depositors[msg.sender] = DepositSnapshot(block.timestamp, true);
        }
        else {
            _getTreasure();            
        }        
        _safeTransferFrom(token, msg.sender, _amount);
        _mint(msg.sender, _amount);        
        emit Deposit(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        _getTreasure();
        _burn(msg.sender, _amount);
        if (balanceOf(msg.sender) == 0){
            delete depositors[msg.sender];
        }        
        _safeTokenPayment(token, payable(msg.sender), _amount);        
        emit Withdraw(msg.sender, _amount);
    }

    function _getTreasure() internal {
        require(depositors[msg.sender].exist, "For getting treasure you need deposit");
        DepositSnapshot storage depositor = depositors[msg.sender];        
        uint256 curTime = block.timestamp;        
        uint256 timeDelta = curTime - depositor.time;
        require(timeDelta > 1 days, "Insufficient time past");

        depositor.time = curTime;

        uint256 treasure = totalBalance * balanceOf(msg.sender) / totalSupply();
        totalBalance = totalBalance - treasure;
        _safeTokenPayment(token, payable(msg.sender), treasure);
        
        emit GetTreasure(msg.sender, treasure);
    }

    function flashloan(address payable _receiver, uint256 _amount, bytes calldata _params) external nonReentrant {
        require(_amount > 0, "FlashLoan amount should be greater than zero");
        require(_receiver != address(0), "Incorrect receiver");
        
        uint256 supplyBefore = IERC20(token).balanceOf(address(this));
        require(supplyBefore >= _amount, "Insufficient liquidity");
        
        uint256 userFee = 0;
        uint256 protocolFee = _amount * adminFee / 10000;
        if (!depositors[msg.sender].exist) {
            userFee = _amount * poolFee / 10000;
        }
        uint256 totalFee = protocolFee + userFee;
        _safeTokenPayment(token, _receiver, _amount);
        
        IFlashloanReceiver(_receiver).executeOperation(msg.sender, token, _amount, totalFee, _params);
        
        uint256 supplyAfter = IERC20(token).balanceOf(address(this));
        require(supplyAfter == (supplyBefore + totalFee), "Flashloan not returned");

        totalBalance = totalBalance + userFee;
        adminBalance = adminBalance + protocolFee;
        emit Flashloan(_receiver, _amount, totalFee);
    }

    function calculateFee(uint256 _amount) external view returns (uint256) {        
        uint256 fee = _amount * adminFee / 10000;
        if (!depositors[msg.sender].exist) {
            fee = fee + _amount * poolFee / 10000;
        }
        return fee;
    }

    function withdrawAdminFees() external {
        require(msg.sender == admin, "Access denied");
        _safeTokenPayment(token, payable(admin), adminBalance);
        adminBalance = 0;        
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {}
    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {}
}
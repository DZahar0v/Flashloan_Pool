import React, {Component} from "react"
import './App.css'
import {getWeb3} from "./getWeb3"
import map from "./artifacts/deployments/map.json"
import {getEthereum} from "./getEthereum"

class App extends Component {

    state = {
        web3: null,
        accounts: null,
        chainid: null,
        pool: null,
        USDTtoken: null,
        userBalance: 0,
        userUSDTBalance: 0,
        userAddress: "",
        totalSupply: 0,
        treasure: 0,
        depositInput: 0,
        withdrawInput: 0,        
        USDTInput: 0,        
    }

    componentDidMount = async () => {

        // Get network provider and web3 instance.
        const web3 = await getWeb3()

        // Try and enable accounts (connect metamask)
        try {
            const ethereum = await getEthereum()
            ethereum.enable()
        } catch (e) {
            console.log(`Could not enable accounts. Interaction with contracts not available.
            Use a modern browser with a Web3 plugin to fix this issue.`)
            console.log(e)
        }

        // Use web3 to get the user's accounts
        const accounts = await web3.eth.getAccounts()

        // Get the current chain id
        const chainid = parseInt(await web3.eth.getChainId())

        this.setState({
            web3,
            accounts,
            chainid
        }, await this.loadInitialContracts)

    }

    loadInitialContracts = async () => {
        if (this.state.chainid <= 42) {
            // Wrong Network!
            return
        }

        const pool = await this.loadContract("dev", "FlashloanPool")        
        const USDTtoken = await this.loadContract("dev", "ERC20Mock")

        if (!pool || !USDTtoken) {
            return
        }

        const {accounts} = this.state
        const userBalance = await pool.methods.balanceOf(accounts[0]).call() 
        const userUSDTBalance = await pool.methods.balanceOf(accounts[0]).call() 
        const userAddress = accounts[0]
        const totalSupply = await pool.methods.totalSupply().call() 
        const treasure = await pool.methods.totalBalance().call()
        
        this.setState({
            pool,
            USDTtoken,
            userBalance,
            userUSDTBalance,
            userAddress,
            totalSupply,
            treasure,
        })
    }

    loadContract = async (chain, contractName) => {
        // Load a deployed contract instance into a web3 contract object
        const {web3} = this.state

        // Get the address of the most recent deployment from the deployment map
        let address
        try {
            address = map[chain][contractName][0]
        } catch (e) {
            console.log(`Couldn't find any deployed contract "${contractName}" on the chain "${chain}".`)
            return undefined
        }

        // Load the artifact with the specified address
        let contractArtifact
        try {
            contractArtifact = await import(`./artifacts/deployments/${chain}/${address}.json`)
        } catch (e) {
            console.log(`Failed to load contract artifact "./artifacts/deployments/${chain}/${address}.json"`)
            return undefined
        }

        return new web3.eth.Contract(contractArtifact.abi, address)
    }

    getUSDTBalance = async () => {
        const {accounts, USDTtoken} = this.state        
        this.setState({
            userUSDTBalance: await USDTtoken.methods.balanceOf(accounts[0]).call()
        })            
    }

    depositFunds = async (e) => {
        const {accounts, pool, depositInput} = this.state
        e.preventDefault()
        const value = parseInt(depositInput)
        if (isNaN(value)) {
            alert("invalid value")
            return
        }
        await pool.methods.deposit(value).send({from: accounts[0]})
            .on('receipt', async () => {
                this.setState({
                    userBalance: await pool.methods.balanceOf(accounts[0]).call()
                })
                this.getUSDTBalance()
            })
    }

    withdrawFunds = async (e) => {
        const {accounts, pool, withdrawInput} = this.state
        e.preventDefault()
        const value = parseInt(withdrawInput)
        if (isNaN(value)) {
            alert("invalid value")
            return
        }
        await pool.methods.withdraw(value).send({from: accounts[0]})
            .on('receipt', async () => {
                this.setState({
                    userBalance: await pool.methods.balanceOf(accounts[0]).call()
                })
                this.getUSDTBalance()
            })
    }            

    mintUSDT = async (e) => {
        const {accounts, USDTtoken, USDTInput} = this.state
        e.preventDefault()
        const value = parseInt(USDTInput)
        if (isNaN(value)) {
            alert("invalid value")
            return
        }
        await USDTtoken.methods.mint(accounts[0], value).send({from: accounts[0]})
            .on('receipt', async () => {
                this.setState({
                    userUSDTBalance: await USDTtoken.methods.balanceOf(accounts[0]).call()
                })                
            })
    }

    render() {        
        const {web3, accounts, chainid, 
            pool, USDTtoken, userBalance, userUSDTBalance, userAddress, totalSupply,
            treasure, depositInput, withdrawInput, USDTInput  
        } = this.state

        if (!web3) {
            return <div>Loading Web3, accounts, and contracts...</div>
        }

        if (isNaN(chainid) || chainid <= 42) {
            return <div>Wrong Network! Switch to your local RPC "Localhost: 8545" in your Web3 provider (e.g. Metamask)</div>
        }

        if (!pool || !USDTtoken) {
            return <div>Could not find a deployed contract. Check console for details.</div>
        }

        const isAccountsUnlocked = accounts ? accounts.length > 0 : false

        return (<div className="App">
            <h1>User Info</h1>            
            {
                !isAccountsUnlocked ?
                    <p><strong>Connect with Metamask and refresh the page to
                        be able to deposit and withdraw.</strong>
                    </p>
                    : null
            }
            <div>User address is: {userAddress}</div>
            <div>User zToken balance is: {userBalance}</div>
            <div>User USDT balance is: {userUSDTBalance}</div>
            <div>zToken total supply is: {totalSupply}</div>
            <div>Current pool treasure is: {treasure}</div>
            <br/>

            <h1>Interaction</h1>                        

            <form onSubmit={(e) => this.depositFunds(e)}>
                <div>
                    <label>Deposit funds: </label>
                    <br/>
                    <input
                        name="depositInput"
                        type="text"
                        value={depositInput}
                        onChange={(e) => this.setState({depositInput: e.target.value})}
                    />
                    <br/>
                    <button type="submit" disabled={!isAccountsUnlocked}>Submit</button>
                </div>
            </form>

            <form onSubmit={(e) => this.withdrawFunds(e)}>
                <div>
                    <label>Withdraw funds: </label>
                    <br/>
                    <input
                        name="withdrawInput"
                        type="text"
                        value={withdrawInput}
                        onChange={(e) => this.setState({withdrawInput: e.target.value})}
                    />
                    <br/>
                    <button type="submit" disabled={!isAccountsUnlocked}>Submit</button>
                </div>
            </form>
            <br/>

            <h1>Features</h1>
            <form onSubmit={(e) => this.mintUSDT(e)}>
                <div>
                    <label>Mint USDT: </label>
                    <br/>
                    <input
                        name="USDTInput"
                        type="text"
                        value={USDTInput}
                        onChange={(e) => this.setState({USDTInput: e.target.value})}
                    />
                    <br/>
                    <button type="submit" disabled={!isAccountsUnlocked}>Submit</button>
                </div>
            </form>

        </div>)
    }
}

export default App

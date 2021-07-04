from brownie import accounts, chain
import pytest

def test_flashloan(USDT_token, pool, loanReceiver):
    
    user_assets = 10**3 * 10**18
    # 1. mint usdt for users 
    print("mint")
    for i in range(1,6):
        USDT_token.mint(accounts[i], user_assets, {'from': accounts[0]})
        print("balance of user " + str(i) + " = " + str(USDT_token.balanceOf(accounts[i]) / 10**18))
    print()
    
    # 2. deposit USDT to pool
    print("deposit")
    for i in range(2,6):
        USDT_token.approve(pool, user_assets, {'from': accounts[i]})
        pool.deposit(user_assets, {'from': accounts[i]})
        print("balance of user " + str(i) + " = " + str(USDT_token.balanceOf(accounts[i]) / 10**18))
    print()

    pool_balance = user_assets * 4
    assert(USDT_token.balanceOf(pool) == pool_balance)

    # 3. execute flashloan
    print("flashloan")
    USDT_token.approve(loanReceiver, user_assets, {'from': accounts[1]})
    print("balance of user 1 =                  " + str(USDT_token.balanceOf(accounts[1]) / 10**18))
    print("approve from user 1 to lonReceiver = " + str(USDT_token.allowance(accounts[1], loanReceiver) / 10**18))
    fee = pool.calculateFee(pool_balance, {'from': accounts[1]})
    print("fee for specified ammount =          " + str(fee / 10**18))
    loanReceiver.executeFlashLoan(pool_balance)
    print()

    for i in range(2,6):        
        assert(USDT_token.balanceOf(accounts[i]) == 0)        

    chain.sleep(60 * 60 * 24 + 100)

    # 4. withdraw tokens
    print("withdraw")
    for i in range(2,6):   
        pool.withdraw(user_assets, {'from': accounts[i]})             
        print("balance of user " + str(i) + " = " + str(USDT_token.balanceOf(accounts[i]) / 10**18))
    print()

    # 5. withdraw admin fees
    print("withdraw admin fees")    
    pool.withdrawAdminFees({'from': accounts[0]})             
    print("balance of admin = " + str(USDT_token.balanceOf(accounts[0]) / 10**18))
    print()
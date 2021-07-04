from brownie import FlashloanPool, ERC20Mock, LoanReceiver, accounts

def main():
    """ Simple deploy script for our contracts. """    
    metamask_user = '0x499Ab66749B8eBc370CC73458D33940ae13f5D99'
    token = ERC20Mock.deploy('USDT', 'USDT', {'from': accounts[0]})        
    user_assets = 10**3 * 10**18    
    token.mint(accounts[1], user_assets, {'from' : accounts[0]})

    pool = FlashloanPool.deploy(token, {'from': accounts[0]})        
    LoanReceiver.deploy(pool, {'from': accounts[1]})    
    accounts[1].transfer(metamask_user, 10 * 10 **18)
    token.transfer(metamask_user, user_assets, {'from': accounts[1]})


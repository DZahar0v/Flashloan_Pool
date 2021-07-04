from brownie import accounts
import pytest

@pytest.fixture(scope='module', autouse=True)
def USDT_token(ERC20Mock):
    token = ERC20Mock.deploy('USDT', 'USDT', {'from': accounts[0]})    
    return token

@pytest.fixture(scope='module', autouse=True)
def pool(FlashloanPool, USDT_token):
    pool = FlashloanPool.deploy(USDT_token, {'from': accounts[0]})    
    return pool

@pytest.fixture(scope='module', autouse=True)
def loanReceiver(LoanReceiver, pool):
    receiver = LoanReceiver.deploy(pool, {'from': accounts[1]})    
    return receiver

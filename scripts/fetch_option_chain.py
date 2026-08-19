# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: './fetch_option_chain.py'
# Bytecode version: 3.13.0rc3 (3571)
# Source timestamp: 2025-08-11 15:09:18 UTC (1754924958)

import requests
import pandas as pd
import time
import random
NSE_URL = 'https://www.nseindia.com'
NSE_OC_URL = f'{NSE_URL}/api/option-chain-indices?symbol=NIFTY'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://www.nseindia.com/option-chain'}
def fetch_option_chain(retries=5, delay=2):
    # ***<module>.fetch_option_chain: Failure: Different control flow
    session = requests.Session()
    try:
        session.get(NSE_URL, timeout=5)
    except Exception as e:
        print(f'[ERROR] NSE base URL error: {e}')
        return {'records': pd.DataFrame(), 'underlying': 0.0}
    for attempt in range(1, retries + 1):
        try:
            res = session.get(NSE_OC_URL, timeout=5)
            if res.status_code == 200 and res.json() is not None:
                df, data = (data, parse_option_chain(data))
                spot_price = float(data.get('records', {}).get('underlyingValue', 0.0))
                return {'records': df, 'underlying': spot_price}
            else:
                print(f'[Attempt {attempt}] Bad status code: {res.status_code}')
        except Exception as e:
            print(f'[Attempt {attempt}] Exception: {e}')
        wait_time = delay * attempt + random.uniform(1, 2)
        print(f'Retrying after {wait_time:.2f} seconds...')
        time.sleep(wait_time)
    print('❌ Failed to fetch data after retries.')
    return {'records': pd.DataFrame(), 'underlying': 0.0}
def parse_option_chain(data):
    rows = []
    for item in data.get('records', {}).get('data', []):
        strike = item.get('strikePrice')
        ce = item.get('CE', {})
        pe = item.get('PE', {})
        rows.append({'strikePrice': strike, 'CE_OI': ce.get('openInterest', 0), 'CE_Chg_OI': ce.get('changeinOpenInterest', 0), 'CE_IV': ce.get('impliedVolatility', 0), 'CE_Volume': ce.get('totalTradedVolume', 0), 'CE_LTP': ce.get('lastPrice', 0), 'PE_OI': pe.get('openInterest', 0), 'PE_Chg_OI': pe.get('changeinOpenInterest', 0), 'PE_IV': pe.get('impliedVolatility', 0), 'PE_Volume': pe.get('totalTradedVolume', 0), 'PE_LTP': pe.get('lastPrice', 0)})
    return pd.DataFrame(rows)
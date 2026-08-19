# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: './backtest.py'
# Bytecode version: 3.13.0rc3 (3571)
# Source timestamp: 2025-08-28 17:43:54 UTC (1756403034)

import os
import pandas as pd
from datetime import datetime
LOG_FILE = 'backtest_log.csv'
STOP_LOSS_POINTS = 30
TAKE_PROFIT_POINTS = 60
def record_prediction(timestamp, signal, spot_price):
    if 'BUY' not in signal:
        return
    else:
        file_exists = os.path.exists(LOG_FILE)
        new_trade = {'Time': [timestamp], 'Predicted': [signal], 'Entry_Price': [spot_price], 'Exit_Price': [None], 'Outcome': ['Pending'], 'P/L_Points': [0.0], 'Resolved_Time': [None]}
        df_new = pd.DataFrame(new_trade)
        if file_exists:
            df = pd.read_csv(LOG_FILE)
            if 'Pending' in df['Outcome'].values:
                return
            else:
                df = pd.concat([df, df_new], ignore_index=True)
        else:
            df = df_new
        df.to_csv(LOG_FILE, index=False)
def resolve_trades(summary):
    # ***<module>.resolve_trades: Failure: Different control flow
    if not isinstance(summary, dict) or 'spot_price' not in summary or 'actionable_signal' not in summary:
        df = None
    else:
            trade_resolved = False
            if not df.empty and df.iloc[(-1)]['Outcome'] == 'Pending':
                    trade_index = df.index[(-1)]
                    trade = df.iloc[(-1)]
                    entry_price = trade['Entry_Price']
                    trade_type = 'CE' if 'CE' in trade['Predicted'] else 'PE'
                    spot_price = summary['spot_price']
                    exit_price = None
                    if 'EXIT' in summary['actionable_signal']:
                        exit_price = spot_price
                    else:
                        sl_price = entry_price - STOP_LOSS_POINTS if trade_type == 'CE' else entry_price + STOP_LOSS_POINTS
                        tp_price = entry_price + TAKE_PROFIT_POINTS if trade_type == 'CE' else entry_price - TAKE_PROFIT_POINTS
                        hit_sl, hit_tp = (False, False)
                        if trade_type == 'CE':
                            if spot_price <= sl_price:
                                hit_sl = True
                            else:
                                if spot_price >= tp_price:
                                    hit_tp = True
                        else:
                            if trade_type == 'PE':
                                if spot_price >= sl_price:
                                    hit_sl = True
                                else:
                                    if spot_price <= tp_price:
                                        hit_tp = True
                        if hit_sl or hit_tp:
                            exit_price = spot_price
                    if exit_price is not None:
                        pl_points = exit_price - entry_price if trade_type == 'CE' else entry_price - exit_price
                        if pl_points > 0:
                            outcome = 'Win'
                        else:
                            if pl_points < 0:
                                outcome = 'Loss'
                            else:
                                outcome = 'Break-Even'
                        df.loc[trade_index, 'Exit_Price'] = exit_price
                        df.loc[trade_index, 'Outcome'] = outcome
                        df.loc[trade_index, 'P/L_Points'] = pl_points
                        df.loc[trade_index, 'Resolved_Time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        trade_resolved = True
            if trade_resolved:
                df.to_csv(LOG_FILE, index=False)
def get_performance_report():
    # ***<module>.get_performance_report: Failure: Different bytecode
    if not os.path.exists(LOG_FILE):
        return 'No backtest data found.'
    else:
        df = pd.read_csv(LOG_FILE)
        resolved = df[df['Outcome'] != 'Pending'].copy()
        if resolved.empty:
            return 'No trades have been resolved yet.'
        else:
            wins = resolved[resolved['Outcome'] == 'Win']
            losses = resolved[resolved['Outcome'] == 'Loss']
            win_rate = len(wins) / len(resolved) * 100 if not resolved.empty else 0
            total_profit = wins['P/L_Points'].sum() if not wins.empty else 0
            total_loss = abs(losses['P/L_Points'].sum()) if not losses.empty else 0
            total_pl = total_profit - total_loss
            profit_factor_str = f'{total_profit / total_loss:.2f}' if total_loss > 0 else 'N/A'
            avg_win = wins['P/L_Points'].mean() if not wins.empty else 0
            avg_loss = losses['P/L_Points'].mean() if not losses.empty else 0
            return f'--- P&L Report ---\nTotal Trades: {len(resolved)} | Wins: {len(wins)} | Losses: {len(losses)}\nWin Rate: {win_rate:.2f}% | Profit Factor: {profit_factor_str}\n\nAverage Win:  {avg_win:+.2f} pts | Average Loss: {avg_loss:+.2f} pts\nNet P/L:   {total_pl:+.2f} points\n'
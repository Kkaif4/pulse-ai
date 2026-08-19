import schedule
import time
from datetime import datetime, time as dt_time
from zoneinfo import ZoneInfo
import logging
import warnings

warnings.simplefilter('ignore', category=UserWarning)

from scripts.fetch_option_chain import fetch_option_chain
from scripts.analyze import analyze_data, load_and_validate_history
from scripts.backtest import record_prediction, resolve_trades, get_performance_report
from scripts.plotter import update_plot, update_aggression_plot, max_pain_trend


logging.basicConfig(
    filename='bot.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)


def is_market_open():
    now_ist = datetime.now(ZoneInfo('Asia/Kolkata'))

    is_market_time = (
        dt_time(9, 15) <= now_ist.time() <= dt_time(15, 30)
    )

    is_weekday = now_ist.weekday() < 5

    return is_weekday and is_market_time


def retry(func, retries=3, delay=2):
    for i in range(retries):
        try:
            return func()

        except Exception as e:
            logging.warning(
                f'Attempt {i + 1}/{retries} failed: {e}. Retrying...'
            )

            time.sleep(delay)

    raise Exception(
        f'Function {func.__name__} failed after {retries} retries.'
    )


def run_bot():
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not is_market_open():
        print(f'[{timestamp}] 💤 Market is closed. Skipping...')
        return

    try:
        data = retry(fetch_option_chain)

        df = data['records']
        spot_price = data['underlying']

        analysis_result = analyze_data(df, spot_price)

        if analysis_result is None:
            logging.error(
                'Analysis returned None — skipping this cycle.'
            )
            return

        ts = analysis_result.get('timestamp')
        sig = analysis_result.get(
            'actionable_signal',
            'NO_SIGNAL'
        )

        record_prediction(
            ts,
            sig,
            spot_price
        )

        resolve_trades(analysis_result)

        update_plot(
            ts,
            analysis_result.get('pcr'),
            analysis_result.get('signal'),
            spot_price
        )

        update_aggression_plot(
            ts,
            analysis_result.get('avg_ce_aggr'),
            analysis_result.get('avg_pe_aggr')
        )

        history_df = load_and_validate_history()

        max_pain_trend(history_df)

        print(
            '\n-------------------- 🧠 pulseAI --------------------'
        )

        print(analysis_result['summary'])

        logging.info(
            f"Signal: {analysis_result['signal']} | "
            f"Sentiment: {analysis_result['sentiment']}"
        )

    except Exception as e:
        error_timestamp = datetime.now().strftime(
            '%Y-%m-%d %H:%M:%S'
        )

        logging.error(
            f'An error occurred in run_bot: {e}',
            exc_info=True
        )

        print(
            f'[{error_timestamp}] ❌ An error occurred: {e}'
        )


def run_end_of_day_report():
    print('\n========================================')
    print('📈 MARKET CLOSED - FINAL PERFORMANCE REPORT 📈')
    print('========================================')

    report = get_performance_report()

    print(report)

    print('========================================\n')

    logging.info('End-of-day report generated.')


print('🚀 pulseAI started...')

run_bot()

schedule.every(1).minutes.do(run_bot)

schedule.every().day.at('15:35').do(run_end_of_day_report)


try:
    while True:
        schedule.run_pending()
        time.sleep(1)

except KeyboardInterrupt:
    print('\n🛑 pulseAI stopped by user.')
    logging.info('pulseAI stopped by user.')
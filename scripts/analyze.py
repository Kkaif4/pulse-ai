import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging
from colorama import Fore, Style, init
import json
import shutil
from pathlib import Path
import pandas_ta as ta

init(autoreset=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

LAST_SNAPSHOT_FILE = "last_snapshot.csv"
SNAPSHOT_HISTORY_FILE = "snapshot_history.csv"
STATE_FILE = "trade_state.json"

CONFIG = {
    "long_ema_period": 10,
    "adx_period": 14,
    "adx_threshold": 20,
    "adx_exit_threshold": 18,
    "buildup_scale": 250000,
    "bearish_multiplier": 1.2,
    "pcr_range": (0.8, 1.3),
    "skew_range": (-3, 3),
    "rsi_period": 10,
    "rsi_thresholds": (80, 20),
    "rsi_penalty": 1.0,
    "trend_weights": {"mt": 0.5, "lt": 0.5, "di_crossover": 0.5},
    "score_thresholds": {
        "strong_buy": 1.0,
        "buy": 0.25,
        "sell": -0.25,
        "strong_sell": -1.0,
    },
    "ranging_conviction_threshold": 1.0,
}

MINIMUM_DATA_POINTS = max(
    CONFIG["long_ema_period"],
    CONFIG["rsi_period"],
    CONFIG["adx_period"],
)


def load_trade_state():
    if not os.path.exists(STATE_FILE):
        return {"is_trade_open": False, "open_trade_type": None}

    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)

        state.setdefault("is_trade_open", False)
        state.setdefault("open_trade_type", None)
        return state
    except (json.JSONDecodeError, IOError):
        logging.warning("Could not read state file, assuming no open trade.")
        return {"is_trade_open": False, "open_trade_type": None}


def save_trade_state(state):
    path = Path(STATE_FILE)
    temp_path = path.with_suffix(".json.tmp")

    try:
        with open(temp_path, "w") as f:
            json.dump(state, f, indent=4)
        os.replace(temp_path, path)
    except IOError as e:
        logging.error(f"Could not save state file: {e}")
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except OSError:
                pass


def safe_write_snapshot(df, filename):
    path = Path(filename)
    temp_path = path.with_suffix(".csv.tmp")

    try:
        df.to_csv(temp_path, index=False)
        os.replace(temp_path, path)
    except Exception as e:
        logging.error(f"Failed to safely write snapshot to {filename}: {e}")
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except OSError:
                pass


def load_and_validate_history():
    if not os.path.exists(SNAPSHOT_HISTORY_FILE):
        return pd.DataFrame()

    try:
        history_df = pd.read_csv(SNAPSHOT_HISTORY_FILE)

        required_cols = [
            "spot_price",
            "timestamp",
            "signal",
            "atm_strike",
            "score",
            "fo_score",
            "pcr",
            "avg_iv_skew",
            "rsi",
            "adx",
        ]

        for col in required_cols:
            if col not in history_df.columns:
                history_df[col] = np.nan

        history_df["timestamp"] = pd.to_datetime(
            history_df["timestamp"], errors="coerce"
        )
        history_df.dropna(subset=["timestamp"], inplace=True)

        today_str = datetime.now().strftime("%Y-%m-%d")
        today_history = history_df[
            history_df["timestamp"].dt.strftime("%Y-%m-%d") == today_str
        ]

        return today_history.copy()

    except Exception as e:
        logging.error(f"Critical error loading history: {e}")

        if os.path.exists(SNAPSHOT_HISTORY_FILE):
            backup_filename = SNAPSHOT_HISTORY_FILE + ".bak"
            try:
                os.rename(SNAPSHOT_HISTORY_FILE, backup_filename)
                logging.warning(
                    f"Moved corrupted history to {backup_filename}"
                )
            except OSError as rename_error:
                logging.error(
                    f"Could not rename history file: {rename_error}"
                )

        return pd.DataFrame()


def min_max_scale(series):
    min_val = series.min()
    max_val = series.max()

    if max_val == min_val:
        return pd.Series(0.5, index=series.index)

    return (series - min_val) / (max_val - min_val)


def add_moneyness_labels(df, spot_price, atm_strike):
    conditions_ce = [
        df["strikePrice"] == atm_strike,
        df["strikePrice"] < spot_price,
        df["strikePrice"] > spot_price,
    ]
    choices_ce = ["ATM", "ITM", "OTM"]

    conditions_pe = [
        df["strikePrice"] == atm_strike,
        df["strikePrice"] > spot_price,
        df["strikePrice"] < spot_price,
    ]
    choices_pe = ["ATM", "ITM", "OTM"]

    df["CE_Moneyness"] = np.select(
        conditions_ce, choices_ce, default="Other"
    )
    df["PE_Moneyness"] = np.select(
        conditions_pe, choices_pe, default="Other"
    )

    return df


def calculate_max_pain_vectorized(df):
    df = df.copy()
    df[["CE_OI", "PE_OI"]] = df[["CE_OI", "PE_OI"]].fillna(0)

    strikes_np = df["strikePrice"].to_numpy()
    ce_oi_np = df["CE_OI"].to_numpy()
    pe_oi_np = df["PE_OI"].to_numpy()

    price_diffs = strikes_np[:, np.newaxis] - strikes_np
    call_losses = np.maximum(price_diffs, 0) * ce_oi_np
    put_losses = np.maximum(-price_diffs, 0) * pe_oi_np

    total_loss = call_losses.sum(axis=1) + put_losses.sum(axis=1)

    return strikes_np[np.argmin(total_loss)]


def inverse_scale_metric(value, normal_range, score_range=(-1, 1)):
    if pd.isna(value):
        return 0

    low, high = normal_range

    if high == low:
        return (score_range[0] + score_range[1]) / 2

    clamped_value = np.clip(value, low, high)
    scaled = (clamped_value - low) / (high - low)

    return (1 - scaled) * (score_range[1] - score_range[0]) + score_range[0]


def calculate_rsi(prices, period=CONFIG["rsi_period"]):
    if len(prices) < period:
        return 50

    rsi_series = ta.rsi(prices, length=period)

    if (
        rsi_series is None
        or rsi_series.empty
        or pd.isna(rsi_series.iloc[-1])
    ):
        return 50

    return rsi_series.iloc[-1]


def calculate_adx(prices, period=CONFIG["adx_period"]):
    default_adx = {"adx": 10, "plus_di": 50, "minus_di": 50}

    if len(prices) < period * 2:
        return default_adx

    price_df = pd.DataFrame({"close": prices})
    price_df["high"] = prices.rolling(window=3, min_periods=1).max()
    price_df["low"] = prices.rolling(window=3, min_periods=1).min()

    adx_df = ta.adx(
        high=price_df["high"],
        low=price_df["low"],
        close=price_df["close"],
        length=period,
    )

    if adx_df is None or adx_df.empty:
        return default_adx

    adx_col = next(
        (col for col in adx_df.columns if col.startswith(f"ADX_{period}")),
        None,
    )
    plus_di_col = next(
        (col for col in adx_df.columns if col.startswith(f"DMP_{period}")),
        None,
    )
    minus_di_col = next(
        (col for col in adx_df.columns if col.startswith(f"DMN_{period}")),
        None,
    )

    if not all([adx_col, plus_di_col, minus_di_col]):
        return default_adx

    final_adx = adx_df[adx_col].iloc[-1]
    final_plus_di = adx_df[plus_di_col].iloc[-1]
    final_minus_di = adx_df[minus_di_col].iloc[-1]

    return {
        "adx": 10 if pd.isna(final_adx) else round(final_adx, 2),
        "plus_di": 50 if pd.isna(final_plus_di) else round(final_plus_di, 2),
        "minus_di": 50 if pd.isna(final_minus_di) else round(final_minus_di, 2),
    }


def calculate_core_metrics(df, spot_price):
    metrics = {}

    df = df.copy()

    df["total_volume"] = df["CE_Volume"] + df["PE_Volume"]
    df["total_oi"] = df["CE_OI"] + df["PE_OI"]

    df["volume_scaled"] = min_max_scale(df["total_volume"])
    df["oi_scaled"] = min_max_scale(df["total_oi"])

    atm_candidates = df[
        df["dist_from_spot"] < spot_price * 0.005
    ].copy()

    if not atm_candidates.empty:
        atm_candidates["atm_score"] = (
            0.7 * atm_candidates["volume_scaled"]
            + 0.3 * atm_candidates["oi_scaled"]
        )
        metrics["atm_strike"] = atm_candidates.loc[
            atm_candidates["atm_score"].idxmax(), "strikePrice"
        ]
    else:
        metrics["atm_strike"] = df.loc[
            df["dist_from_spot"].idxmin(), "strikePrice"
        ]

    df = add_moneyness_labels(df, spot_price, metrics["atm_strike"])

    ce_vol_sum = df["CE_Volume"].sum()
    pe_vol_sum = df["PE_Volume"].sum()

    metrics["pcr"] = (
        round(pe_vol_sum / ce_vol_sum, 2) if ce_vol_sum > 0 else 1.0
    )

    df["liquidity_score"] = (
        0.8 * df["volume_scaled"] + 0.2 * df["oi_scaled"]
    )

    liquid_df = df[
        df["liquidity_score"] >= df["liquidity_score"].quantile(0.5)
    ].copy()

    metrics["max_pain"] = (
        calculate_max_pain_vectorized(liquid_df)
        if not liquid_df.empty
        else metrics["atm_strike"]
    )

    try:
        metrics["support"] = df.loc[
            df["PE_OI"].idxmax(), "strikePrice"
        ]
    except ValueError:
        metrics["support"] = metrics["atm_strike"]

    try:
        metrics["resistance"] = df.loc[
            df["CE_OI"].idxmax(), "strikePrice"
        ]
    except ValueError:
        metrics["resistance"] = metrics["atm_strike"]

    skew_range = spot_price * 0.0075

    near_the_money_df = df[
        df["strikePrice"].between(
            metrics["atm_strike"] - skew_range,
            metrics["atm_strike"] + skew_range,
        )
    ]

    metrics["avg_iv_skew"] = (
        (
            near_the_money_df["PE_IV"]
            - near_the_money_df["CE_IV"]
        ).mean()
        if not near_the_money_df.empty
        else 0
    )

    atm_row_df = df[df["strikePrice"] == metrics["atm_strike"]]

    metrics["atm_straddle_cost"] = (
        atm_row_df["CE_LTP"].sum() + atm_row_df["PE_LTP"].sum()
    )

    metrics["top_3_support"] = (
        df.sort_values(by="PE_OI", ascending=False)
        .head(3)["strikePrice"]
        .tolist()
    )

    metrics["top_3_resistance"] = (
        df.sort_values(by="CE_OI", ascending=False)
        .head(3)["strikePrice"]
        .tolist()
    )

    metrics["total_ce_chg_oi"] = int(df["CE_Chg_OI"].sum())
    metrics["total_pe_chg_oi"] = int(df["PE_Chg_OI"].sum())
    metrics["total_ce_vol"] = int(ce_vol_sum)
    metrics["total_pe_vol"] = int(pe_vol_sum)

    metrics["avg_ce_aggr"] = round(
        (
            df["CE_Volume"]
            / df["CE_OI"].replace(0, np.nan)
        ).mean(skipna=True),
        2,
    )

    metrics["avg_pe_aggr"] = round(
        (
            df["PE_Volume"]
            / df["PE_OI"].replace(0, np.nan)
        ).mean(skipna=True),
        2,
    )

    metrics["avg_ce_aggr"] = (
        0 if pd.isna(metrics["avg_ce_aggr"]) else metrics["avg_ce_aggr"]
    )
    metrics["avg_pe_aggr"] = (
        0 if pd.isna(metrics["avg_pe_aggr"]) else metrics["avg_pe_aggr"]
    )

    return metrics, df


def calculate_trend_metrics(history_df, spot_price):
    trends = {
        "spot_trend": "N/A",
        "ema_trend": "N/A",
        "long_term_trend": "N/A",
    }

    if not history_df.empty:
        if len(history_df) > 1:
            if spot_price > history_df["spot_price"].iloc[-1]:
                trends["spot_trend"] = "Uptrend"
            elif spot_price < history_df["spot_price"].iloc[-1]:
                trends["spot_trend"] = "Downtrend"
            else:
                trends["spot_trend"] = "Sideways"

        temp_prices = pd.concat(
            [history_df["spot_price"], pd.Series([spot_price])],
            ignore_index=True,
        )

        if len(temp_prices) >= 5:
            spot_ema = temp_prices.ewm(
                span=5, adjust=False
            ).mean()

            if spot_ema.iloc[-1] > spot_ema.iloc[-2]:
                trends["ema_trend"] = "Uptrend"
            elif spot_ema.iloc[-1] < spot_ema.iloc[-2]:
                trends["ema_trend"] = "Downtrend"
            else:
                trends["ema_trend"] = "Sideways"

        if len(temp_prices) >= CONFIG["long_ema_period"]:
            long_term_ema = temp_prices.ewm(
                span=CONFIG["long_ema_period"],
                adjust=False,
            ).mean()

            if spot_price > long_term_ema.iloc[-1]:
                trends["long_term_trend"] = "Uptrend"
            elif spot_price < long_term_ema.iloc[-1]:
                trends["long_term_trend"] = "Downtrend"
            else:
                trends["long_term_trend"] = "Sideways"

    return trends


def calculate_fo_score(df, history_df, long_term_trend, prev_df=None):
    if history_df.empty:
        return 0

    if prev_df is None:
        if not os.path.exists(LAST_SNAPSHOT_FILE):
            return 0
        try:
            prev_df = pd.read_csv(LAST_SNAPSHOT_FILE)
        except (FileNotFoundError, pd.errors.EmptyDataError):
            return 0

    merged = pd.merge(
        df,
        prev_df,
        on="strikePrice",
        suffixes=("", "_prev"),
        how="inner",
    ).fillna(0)

    liquidity_weight = (
        1
        + (
            merged["liquidity_score"]
            if "liquidity_score" in merged.columns
            else 0
        )
    )

    ce_oi_diff = merged["CE_OI"] - merged.get("CE_OI_prev", 0)
    ce_ltp_diff = merged["CE_LTP"] - merged.get("CE_LTP_prev", 0)
    pe_oi_diff = merged["PE_OI"] - merged.get("PE_OI_prev", 0)
    pe_ltp_diff = merged["PE_LTP"] - merged.get("PE_LTP_prev", 0)

    short_covering = (ce_oi_diff > 0) & (ce_ltp_diff > 0)
    long_buildup = (ce_oi_diff < 0) & (ce_ltp_diff > 0)

    put_short_covering = (pe_oi_diff < 0) & (pe_ltp_diff < 0)
    put_unwinding = (pe_oi_diff > 0) & (pe_ltp_diff < 0)

    bullish_oi = (
        ce_oi_diff.where(long_buildup, 0)
        + abs(ce_oi_diff.where(short_covering, 0))
        + abs(pe_oi_diff.where(put_unwinding, 0))
        + pe_oi_diff.where(put_short_covering, 0)
    ) * liquidity_weight

    long_unwinding = (ce_oi_diff > 0) & (ce_ltp_diff < 0)
    short_buildup = (ce_oi_diff < 0) & (ce_ltp_diff < 0)

    put_buildup = (pe_oi_diff > 0) & (pe_ltp_diff > 0)
    put_long_unwinding = (pe_oi_diff < 0) & (pe_ltp_diff > 0)

    bearish_oi = (
        ce_oi_diff.where(short_buildup, 0)
        + abs(ce_oi_diff.where(long_unwinding, 0))
        + pe_oi_diff.where(put_buildup, 0)
        + abs(pe_oi_diff.where(put_long_unwinding, 0))
    ) * liquidity_weight

    total_bullish_oi = bullish_oi.sum()
    total_bearish_oi = bearish_oi.sum()

    if long_term_trend == "Downtrend":
        effective_multiplier = CONFIG["bearish_multiplier"]
    elif long_term_trend == "Uptrend":
        effective_multiplier = 1.0
    else:
        effective_multiplier = 1.1

    return total_bullish_oi - total_bearish_oi * effective_multiplier


def calculate_final_score(
    core_metrics,
    trend_metrics,
    fo_score,
    rsi_value,
    adx_data,
):
    score = 0

    score += inverse_scale_metric(
        core_metrics.get("pcr", 1.0),
        CONFIG["pcr_range"],
    )

    score += inverse_scale_metric(
        core_metrics.get("avg_iv_skew", 0),
        CONFIG["skew_range"],
    )

    if trend_metrics.get("ema_trend") == "Uptrend":
        score += CONFIG["trend_weights"]["mt"]
    elif trend_metrics.get("ema_trend") == "Downtrend":
        score -= CONFIG["trend_weights"]["mt"]

    if trend_metrics.get("long_term_trend") == "Uptrend":
        score += CONFIG["trend_weights"]["lt"]
    elif trend_metrics.get("long_term_trend") == "Downtrend":
        score -= CONFIG["trend_weights"]["lt"]

    if adx_data.get("plus_di", 50) > adx_data.get("minus_di", 50):
        score += CONFIG["trend_weights"].get("di_crossover", 0.5)
    elif adx_data.get("minus_di", 50) > adx_data.get("plus_di", 50):
        score -= CONFIG["trend_weights"].get("di_crossover", 0.5)

    buildup_contribution = np.clip(
        fo_score / CONFIG["buildup_scale"],
        -1.5,
        1.5,
    )
    score += buildup_contribution

    rsi_overbought, rsi_oversold = CONFIG["rsi_thresholds"]

    if score > 0 and rsi_value > rsi_overbought:
        score -= CONFIG["rsi_penalty"]
    elif score < 0 and rsi_value < rsi_oversold:
        score += CONFIG["rsi_penalty"]

    return score


def analyze_data(df, spot_price, history_df=None, prev_df=None, trade_state_override=None):
    try:
        if df is None or df.empty:
            raise ValueError("Option chain data is empty.")

        numeric_cols = [
            "CE_OI",
            "PE_OI",
            "CE_Chg_OI",
            "PE_Chg_OI",
            "CE_Volume",
            "PE_Volume",
            "CE_LTP",
            "PE_LTP",
            "PE_IV",
            "CE_IV",
        ]

        for col in numeric_cols:
            df[col] = pd.to_numeric(
                df[col],
                errors="coerce",
            ).fillna(0)

        if "dist_from_spot" not in df.columns:
            df["dist_from_spot"] = (
                df["strikePrice"] - spot_price
            ).abs()

        core_metrics, df_with_metrics = calculate_core_metrics(
            df,
            spot_price,
        )

        is_api_mode = trade_state_override is not None

        if history_df is None:
            history_df = load_and_validate_history()

        if trade_state_override is None:
            trade_state = load_trade_state()
        else:
            trade_state = trade_state_override

        is_trade_open = trade_state.get("is_trade_open", False)
        open_trade_type = trade_state.get("open_trade_type")

        trend_metrics = {
            "spot_trend": "N/A",
            "ema_trend": "N/A",
            "long_term_trend": "N/A",
        }

        fo_score = 0
        score = 0
        rsi_value = 50
        sentiment = "Initializing"
        signal = "Waiting for Data"
        actionable_signal = "WARMING UP"
        regime = "Unknown"
        adx_data = {}

        if len(history_df) >= MINIMUM_DATA_POINTS:
            temp_prices = pd.concat(
                [
                    history_df["spot_price"],
                    pd.Series([spot_price]),
                ],
                ignore_index=True,
            )

            trend_metrics = calculate_trend_metrics(
                history_df,
                spot_price,
            )

            fo_score = calculate_fo_score(
                df_with_metrics,
                history_df,
                trend_metrics.get("long_term_trend"),
                prev_df=prev_df,
            )

            rsi_value = calculate_rsi(temp_prices)
            adx_data = calculate_adx(temp_prices)

            score = calculate_final_score(
                core_metrics,
                trend_metrics,
                fo_score,
                rsi_value,
                adx_data,
            )

            s_th = CONFIG["score_thresholds"]

            if score >= s_th["strong_buy"]:
                sentiment, raw_signal = "Strong Bullish", "BUY CE"
            elif score > s_th["buy"]:
                sentiment, raw_signal = "Bullish", "BUY CE"
            elif score <= s_th["strong_sell"]:
                sentiment, raw_signal = "Strong Bearish", "BUY PE"
            elif score < s_th["sell"]:
                sentiment, raw_signal = "Bearish", "BUY PE"
            else:
                sentiment, raw_signal = "Sideways", "Sideways"

            if is_trade_open:
                if (
                    open_trade_type == "CE"
                    and "Bearish" in sentiment
                ) or (
                    open_trade_type == "PE"
                    and "Bullish" in sentiment
                ):
                    signal = (
                        f"EXIT {open_trade_type} (Sentiment Flip)"
                    )
                    new_state = {
                        "is_trade_open": False,
                        "open_trade_type": None,
                    }
                    trade_state.update(new_state)
                    if not is_api_mode:
                        save_trade_state(new_state)

                elif adx_data.get("adx", 0) < CONFIG["adx_exit_threshold"]:
                    signal = f"EXIT {open_trade_type} (Trend Lost)"
                    new_state = {
                        "is_trade_open": False,
                        "open_trade_type": None,
                    }
                    trade_state.update(new_state)
                    if not is_api_mode:
                        save_trade_state(new_state)

                elif (
                    raw_signal.split(" ")[-1] == open_trade_type
                    and "Sideways" not in sentiment
                ):
                    signal = f"HOLD {open_trade_type}"

                else:
                    signal = f"EXIT {open_trade_type} (Reversal)"
                    new_state = {
                        "is_trade_open": False,
                        "open_trade_type": None,
                    }
                    trade_state.update(new_state)
                    if not is_api_mode:
                        save_trade_state(new_state)

            else:
                regime = (
                    "Trending"
                    if adx_data.get("adx", 0)
                    > CONFIG["adx_threshold"]
                    else "Ranging"
                )

                if "BUY" in raw_signal and regime == "Trending":
                    signal = raw_signal
                    new_state = {
                        "is_trade_open": True,
                        "open_trade_type": signal.split(" ")[-1],
                    }
                    trade_state.update(new_state)
                    if not is_api_mode:
                        save_trade_state(new_state)
                else:
                    signal = (
                        f"Sideways ({'ADX Low' if 'BUY' in raw_signal else regime})"
                    )

        else:
            signal = (
                f"Waiting for Data "
                f"({len(history_df) + 1}/{MINIMUM_DATA_POINTS})"
            )

        actionable_signal = "NO ACTION"
        signal_parts = signal.split(" ")
        action = signal_parts[0]

        if action in ["BUY", "HOLD", "EXIT"]:
            trade_instrument = (
                open_trade_type
                if action in ["HOLD", "EXIT"]
                else signal_parts[-1]
            )

            if trade_instrument:
                actionable_signal = (
                    f"{action} "
                    f"{core_metrics.get('atm_strike', 'N/A')} "
                    f"{trade_instrument}"
                )

        current_time = datetime.now().strftime("%I:%M:%S %p")

        signal_color = Fore.WHITE

        if actionable_signal.startswith("BUY") and "CE" in actionable_signal:
            signal_color = Fore.GREEN
        elif actionable_signal.startswith("BUY") and "PE" in actionable_signal:
            signal_color = Fore.RED
        elif "HOLD" in actionable_signal:
            signal_color = Fore.YELLOW
        elif "EXIT" in actionable_signal:
            signal_color = Fore.CYAN

        summary = (
            f"⏰ Time: {current_time} | "
            f"💰 Spot: {spot_price:.2f}\n"
            f"📊 Vol PCR: {core_metrics.get('pcr', 'N/A')} | "
            f"🛡️ Max Pain: {core_metrics.get('max_pain', 'N/A')}\n"
            f"📈 Support: {core_metrics.get('support', 'N/A')} | "
            f"Top 3: {core_metrics.get('top_3_support', [])}\n"
            f"📈 Resistance: {core_metrics.get('resistance', 'N/A')} | "
            f"Top 3: {core_metrics.get('top_3_resistance', [])}\n"
            f"🔄 OI Chg ➔ CE: "
            f"{core_metrics.get('total_ce_chg_oi', 0):.2f} | "
            f"PE: {core_metrics.get('total_pe_chg_oi', 0):.2f}\n"
            f"🔥 Aggr ➔ CE: "
            f"{core_metrics.get('avg_ce_aggr', 0):.2f} | "
            f"PE: {core_metrics.get('avg_pe_aggr', 0):.2f}\n"
            f"🔮 Sentiment: {sentiment} "
            f"(Score: {score:.2f}) | "
            f"💡 Signal: {signal}\n"
            f"{signal_color}✅ Actionable: "
            f"{actionable_signal}{Style.RESET_ALL}"
        )

        history_data = {
            "timestamp": datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S.%f"
            ),
            "spot_price": spot_price,
            "signal": signal,
            "score": score,
            "pcr": core_metrics.get("pcr"),
            "avg_iv_skew": core_metrics.get("avg_iv_skew"),
            "fo_score": fo_score,
            "rsi": rsi_value,
            "adx": adx_data.get("adx"),
            "atm_strike": core_metrics.get("atm_strike"),
            "total_ce_chg_oi": core_metrics.get("total_ce_chg_oi"),
            "total_pe_chg_oi": core_metrics.get("total_pe_chg_oi"),
            "atm_straddle_cost": core_metrics.get("atm_straddle_cost"),
            "max_pain": core_metrics.get("max_pain"),
        }

        if not is_api_mode:
            safe_write_snapshot(
                df_with_metrics,
                LAST_SNAPSHOT_FILE,
            )

            try:
                full_history = (
                    pd.read_csv(SNAPSHOT_HISTORY_FILE)
                    if os.path.exists(SNAPSHOT_HISTORY_FILE)
                    else pd.DataFrame()
                )

                updated_history = pd.concat(
                    [
                        full_history,
                        pd.DataFrame([history_data]),
                    ],
                    ignore_index=True,
                )

                safe_write_snapshot(
                    updated_history,
                    SNAPSHOT_HISTORY_FILE,
                )

            except Exception as e:
                logging.error(
                    f"Could not update history file: {e}"
                )

        structured_signal = {
            "action": "NONE",
            "instrument": None,
            "strike": None,
        }

        if actionable_signal != "NO ACTION":
            parts = actionable_signal.split(" ")

            if len(parts) >= 3:
                action_word = parts[0]
                instrument_type = parts[2]

                try:
                    strike = int(float(parts[1]))
                except (ValueError, TypeError):
                    strike = None

                structured_signal = {
                    "action": action_word,
                    "instrument": instrument_type,
                    "strike": strike,
                }

        return {
            "summary": summary,
            "structured_signal": structured_signal,
            **core_metrics,
            **trend_metrics,
            "fo_score": fo_score,
            "rsi": rsi_value,
            "adx": adx_data.get("adx"),
            "score": score,
            "sentiment": sentiment,
            "signal": signal,
            "actionable_signal": actionable_signal,
            "spot_price": spot_price,
        }

    except Exception as e:
        logging.error(
            f"[ERROR in analyze_data]: {e}",
            exc_info=True,
        )
        return {
            "summary": f"Analysis error: {e}",
            "structured_signal": {
                "action": "NONE",
                "instrument": None,
                "strike": None,
            },
            "signal": "ERROR",
            "actionable_signal": "NO ACTION",
            "spot_price": spot_price,
        }

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import os
import uvicorn

# Import existing analysis and plotting modules
from scripts.fetch_option_chain import fetch_option_chain
from scripts.analyze import analyze_data
from scripts.plotter import generate_trading_plot, generate_aggression_plot, generate_max_pain_plot

app = FastAPI(title="pulseAI Analysis Worker")

# Internal API Secret for VPC protection
API_SECRET = os.getenv("INTERNAL_API_SECRET", "pulse_secret_key_change_me")

class AnalysisRequest(BaseModel):
    prev_snapshot: Optional[List[Dict[str, Any]]] = None
    history: Optional[List[Dict[str, Any]]] = None
    trade_state: Optional[Dict[str, Any]] = None

class ChartsRequest(BaseModel):
    history: List[Dict[str, Any]]

@app.post("/analyze")
async def run_analysis(
    req: AnalysisRequest,
    x_api_secret: Optional[str] = Header(None)
):
    # Verify secure internal header
    if x_api_secret != API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret token"
        )

    # 1. Fetch live option chain data
    try:
        data = fetch_option_chain()
        raw_df = data['records']
        spot_price = data['underlying']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch live option chain: {e}"
        )

    if raw_df.empty:
        raise HTTPException(
            status_code=status.HTTP_204_NO_CONTENT,
            detail="Empty option chain records returned"
        )

    # 2. Parse optional history & prev_snapshot inputs into DataFrames
    history_df = None
    if req.history:
        history_df = pd.DataFrame(req.history)
        if not history_df.empty:
            # Normalize camelCase database keys to python snake_case for calculations and plotting
            history_df = history_df.rename(columns={
                "spotPrice": "spot_price",
                "maxPain": "max_pain",
                "avgCeAggr": "avg_ce_aggr",
                "avgPeAggr": "avg_pe_aggr"
            })
            history_df["timestamp"] = pd.to_datetime(history_df["timestamp"], errors="coerce")

    prev_df = None
    if req.prev_snapshot:
        prev_df = pd.DataFrame(req.prev_snapshot)

    # 3. Call core analytical method
    results = analyze_data(
        df=raw_df,
        spot_price=spot_price,
        history_df=history_df,
        prev_df=prev_df,
        trade_state_override=req.trade_state
    )

    # 4. Generate in-memory plots using the historical DataFrame
    trading_plot_b64 = ""
    aggression_plot_b64 = ""
    max_pain_plot_b64 = ""

    if history_df is not None and not history_df.empty:
        try:
            # Append current results to history df to include the current point in charts
            current_row = pd.DataFrame([{
                "timestamp": pd.Timestamp.now(),
                "spot_price": spot_price,
                "pcr": results.get("pcr", 1.0),
                "signal": results.get("signal", "Sideways"),
                "avg_ce_aggr": results.get("avg_ce_aggr", 0.0),
                "avg_pe_aggr": results.get("avg_pe_aggr", 0.0),
                "max_pain": results.get("max_pain", spot_price)
            }])
            extended_history = pd.concat([history_df, current_row], ignore_index=True)
            
            trading_plot_b64 = generate_trading_plot(extended_history)
            aggression_plot_b64 = generate_aggression_plot(extended_history)
            max_pain_plot_b64 = generate_max_pain_plot(extended_history)
        except Exception as plot_err:
            # Graceful error handling in backend, do not crash execution
            print(f"[PLOT ERROR] Failed to generate in-memory charts: {plot_err}")

    # Convert the current option chain df to list of dicts to return for next snapshot preservation
    current_snapshot = raw_df.to_dict(orient="records")

    return {
        "analysis": results,
        "current_snapshot": current_snapshot,
        "charts": {
            "trading_plot": trading_plot_b64,
            "aggression_plot": aggression_plot_b64,
            "max_pain_plot": max_pain_plot_b64
        }
    }

@app.post("/charts")
async def generate_charts_only(
    req: ChartsRequest,
    x_api_secret: Optional[str] = Header(None)
):
    if x_api_secret != API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret token"
        )
    
    if not req.history:
        return {
            "trading_plot": "",
            "aggression_plot": "",
            "max_pain_plot": ""
        }
        
    try:
        df = pd.DataFrame(req.history)
        df = df.rename(columns={
            "spotPrice": "spot_price",
            "maxPain": "max_pain",
            "avgCeAggr": "avg_ce_aggr",
            "avgPeAggr": "avg_pe_aggr"
        })
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        
        return {
            "trading_plot": generate_trading_plot(df),
            "aggression_plot": generate_aggression_plot(df),
            "max_pain_plot": generate_max_pain_plot(df)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"In-memory rendering failed: {e}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

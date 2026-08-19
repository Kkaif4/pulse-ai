import matplotlib
matplotlib.use('Agg') # Headless mode for server execution
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
import io
import base64

def generate_trading_plot(history_df: pd.DataFrame) -> str:
    if history_df.empty:
        return ""
    
    # Copy to avoid modifying caller's data
    df = history_df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by='timestamp')

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True, gridspec_kw={'height_ratios': [3, 1]})
    fig.suptitle('pulseAI Live Analysis', fontsize=14, color='white', fontweight='bold')
    fig.patch.set_facecolor('#09090b') # Dark theme matching dashboard
    
    # Upper Plot: Spot Price & Signals
    ax1.set_facecolor('#09090b')
    ax1.plot(df['timestamp'], df['spot_price'], label='Spot Price', color='#38bdf8', linewidth=2)
    
    # Map signals
    buy_ce = df[df['signal'] == 'BUY CE']
    buy_pe = df[df['signal'] == 'BUY PE']
    exit_sig = df[df['signal'].str.contains('EXIT', na=False)]
    
    ax1.scatter(buy_ce['timestamp'], buy_ce['spot_price'], label='Buy Call (CE)', marker='^', color='#4ade80', s=100, zorder=5)
    ax1.scatter(buy_pe['timestamp'], buy_pe['spot_price'], label='Buy Put (PE)', marker='v', color='#f87171', s=100, zorder=5)
    ax1.scatter(exit_sig['timestamp'], exit_sig['spot_price'], label='Exit Position', marker='.', color='#c084fc', s=150, zorder=5)
    
    ax1.set_ylabel('Spot Price', color='#a1a1aa')
    ax1.tick_params(colors='#71717a')
    ax1.grid(True, linestyle='--', color='#27272a', alpha=0.5)
    ax1.legend(facecolor='#18181b', edgecolor='#27272a', labelcolor='white')
    
    # Lower Plot: PCR
    ax2.set_facecolor('#09090b')
    ax2.plot(df['timestamp'], df['pcr'], label='PCR', color='#fb923c', marker='.', linestyle='--')
    ax2.axhline(1.0, color='#71717a', linestyle=':', label='PCR=1.0')
    ax2.set_ylabel('PCR Value', color='#a1a1aa')
    ax2.tick_params(colors='#71717a')
    ax2.grid(True, linestyle='--', color='#27272a', alpha=0.5)
    ax2.legend(facecolor='#18181b', edgecolor='#27272a', labelcolor='white')
    
    plt.xticks(rotation=30)
    ax2.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
    plt.tight_layout()
    
    # Save to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight', dpi=120)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def generate_aggression_plot(history_df: pd.DataFrame) -> str:
    if history_df.empty:
        return ""
        
    df = history_df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by='timestamp')

    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor('#09090b')
    ax.set_facecolor('#09090b')
    
    ax.plot(df['timestamp'], df['avg_ce_aggr'], label='Call Aggression', color='#4ade80', marker='.', linewidth=1.5)
    ax.plot(df['timestamp'], df['avg_pe_aggr'], label='Put Aggression', color='#f87171', marker='.', linewidth=1.5)
    
    ax.set_title('pulseAI Live Aggression Trend (Volume / OI)', fontsize=14, color='white', fontweight='bold')
    ax.set_ylabel('Aggression Ratio', color='#a1a1aa')
    ax.tick_params(colors='#71717a')
    ax.grid(True, linestyle='--', color='#27272a', alpha=0.5)
    ax.legend(facecolor='#18181b', edgecolor='#27272a', labelcolor='white')
    
    plt.xticks(rotation=30)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight', dpi=120)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def generate_max_pain_plot(history_df: pd.DataFrame) -> str:
    if history_df.empty or 'max_pain' not in history_df.columns:
        return ""
        
    df = history_df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by='timestamp')

    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor('#09090b')
    ax.set_facecolor('#09090b')
    
    ax.plot(df['timestamp'], df['spot_price'], color='#38bdf8', linewidth=2, label='Spot Price')
    ax.plot(df['timestamp'], df['max_pain'], color='#fb923c', linewidth=2, label='Max Pain', drawstyle='steps-post')
    
    ax.set_title('pulseAI Live Max Pain vs Spot Trend', fontsize=14, color='white', fontweight='bold')
    ax.set_ylabel('Price Level', color='#a1a1aa')
    ax.tick_params(colors='#71717a')
    ax.grid(True, linestyle='--', color='#27272a', alpha=0.5)
    ax.legend(facecolor='#18181b', edgecolor='#27272a', labelcolor='white')
    
    plt.xticks(rotation=30)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight', dpi=120)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')
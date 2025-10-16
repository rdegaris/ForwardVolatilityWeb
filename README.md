# Forward Volatility Calculator - Web Interface

A modern web interface for calculating forward implied volatility using React, TypeScript, and Vite.

## Features

- ��� Calculate forward volatility for calendar spread options
- ��� Interactive UI with real-time calculations
- ��� Responsive design with Tailwind CSS
- ��� Dark mode support
- ⚡ Fast development with Vite

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (you currently have 21.1.0 which may cause issues)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Build

```bash
npm run build
```

The build output will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## How It Works

The calculator implements the forward volatility formula:

```
σ_forward = √[(σ_back² × T₂ - σ_front² × T₁) / (T₂ - T₁)]
```

Where:
- σ_front = Implied volatility of the front month option
- σ_back = Implied volatility of the back month option
- T₁ = Time to expiration of front month (in years)
- T₂ = Time to expiration of back month (in years)

### Black-Scholes Implementation

The calculator uses the Black-Scholes model to calculate implied volatility from option prices using the Newton-Raphson method.

## Project Structure

```
src/
├── components/
│   └── VolatilityCalculator.tsx  # Main calculator component
├── lib/
│   └── volatility.ts              # Volatility calculation logic
├── types/
│   └── volatility.ts              # TypeScript type definitions
├── App.tsx                        # Main app component
├── main.tsx                       # Entry point
└── index.css                      # Tailwind CSS
```

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Math**: Black-Scholes model for implied volatility

## Usage

1. Enter the **Front Month Option** details (strike, price, DTE)
2. Enter the **Back Month Option** details (strike, price, DTE)
3. Set the **Underlying Price** and **Risk-Free Rate**
4. Click **Calculate Forward Volatility**
5. View the results showing both implied volatilities and the forward volatility

## Note

This calculator is for educational purposes only. Always verify calculations and consult with financial professionals before making trading decisions.

## License

MIT

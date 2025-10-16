# Development Notes

## Node.js Version Issue

⚠️ **Important**: Your current Node.js version (21.1.0) is not supported by Vite 7.

### Solution Options:

1. **Upgrade Node.js** (Recommended)
   - Download Node.js 22.12+ from https://nodejs.org/
   - Or use nvm (Node Version Manager)

2. **Use Compatible Vite Version**
   ```bash
   npm install vite@5 --save-dev
   ```

## Running the App

Once Node.js is updated or Vite is downgraded:

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Project Files Created

- ✅ `package.json` - Dependencies configured
- ✅ `tailwind.config.js` - Tailwind CSS configuration
- ✅ `postcss.config.js` - PostCSS configuration
- ✅ `src/index.css` - Tailwind directives
- ✅ `src/main.tsx` - React entry point
- ✅ `src/App.tsx` - Main app component
- ✅ `src/components/VolatilityCalculator.tsx` - Calculator UI
- ✅ `src/lib/volatility.ts` - Mathematical calculations
- ✅ `src/types/volatility.ts` - TypeScript types

## Features Implemented

### Calculator Inputs
- Front Month: Strike, Price, DTE
- Back Month: Strike, Price, DTE
- Underlying Price
- Risk-Free Rate

### Calculations
- Black-Scholes option pricing
- Implied volatility (Newton-Raphson method)
- Forward volatility formula

### UI Features
- Responsive design
- Dark mode support
- Real-time input validation
- Clear results display

## Next Steps

1. Fix Node.js version or downgrade Vite
2. Run `npm run dev`
3. Test the calculator with sample data
4. Customize styling if needed
5. Add additional features (e.g., Greeks, charts)

## Sample Test Data

Try these values to verify the calculator works:

**Front Month:**
- Strike: 100
- Price: 5
- DTE: 30

**Back Month:**
- Strike: 100
- Price: 8
- DTE: 60

**Other:**
- Underlying: 100
- Risk-Free Rate: 5%

Expected results should show reasonable IV values (typically 20-50%) and a forward vol calculation.

# Mapbox Token Configuration

## Getting a Mapbox Access Token

This application requires a Mapbox access token to display maps. Follow these steps:

1. **Create a Free Account**
   - Go to https://account.mapbox.com/
   - Sign up for a free account (no credit card required)
   - The free tier includes 50,000 map loads per month

2. **Get Your Access Token**
   - After signing in, you'll see your default public token
   - Or create a new token at https://account.mapbox.com/access-tokens/
   - Copy the token (starts with `pk.`)

3. **Add Token to the App**
   - Open `src/components/MapView.tsx`
   - Find this line near the top:
     ```typescript
     mapboxgl.accessToken = 'pk.eyJ1IjoibmF2eC1wd2EiLCJhIjoiY2x5MHN0ZXhwMDFuMjJrcXk1eGU5Zjd1ZCJ9.PLACEHOLDER';
     ```
   - Replace the entire token string with your actual token:
     ```typescript
     mapboxgl.accessToken = 'pk.eyJ1Ijoi...your-actual-token...';
     ```

4. **Rebuild the App**
   ```bash
   npm run build
   ```

## Token Scopes

For this application, the default token scopes are sufficient:
- ✅ Styles API
- ✅ Maps API
- ✅ Navigation API

## Security Note

- The token in `MapView.tsx` is a **public** token
- It's safe to expose in client-side code
- Mapbox restricts usage by URL referrer
- Consider adding URL restrictions in production

## Alternative: Environment Variables

For better security, you can use environment variables:

1. Create `.env.local`:
   ```
   VITE_MAPBOX_TOKEN=pk.your-actual-token
   ```

2. Update `MapView.tsx`:
   ```typescript
   mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
   ```

3. Add `.env.local` to `.gitignore` (already included)

## Troubleshooting

**Map not loading?**
- Check browser console for errors
- Verify token is valid
- Ensure you have internet connection
- Check if you've exceeded free tier limits

**"Not authorized" error?**
- Token may be expired or invalid
- Generate a new token on Mapbox website
- Make sure token includes required scopes

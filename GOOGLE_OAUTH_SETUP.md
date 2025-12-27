# Google Photos OAuth Setup Guide

This guide will help you set up Google OAuth credentials to enable Google Photos integration in the Adult Content Manager app.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step-by-Step Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Adult Content Manager`
4. Click **Create**

### 2. Enable Google Photos Library API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Photos Library API"
3. Click on it and press **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Adult Content Manager
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On the **Scopes** page, click **Add or Remove Scopes**
7. Add these scopes:
   - `https://www.googleapis.com/auth/photoslibrary.readonly`
   - `https://www.googleapis.com/auth/photoslibrary.sharing`
8. Click **Update** → **Save and Continue**
9. Add test users (your Google account email)
10. Click **Save and Continue**

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: Web application
4. Enter name: `Adult Content Manager Web`
5. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - Your production domain (e.g., `https://your-app.manus.space`)
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/` (for development)
   - Your production domain (e.g., `https://your-app.manus.space/`)
7. Click **Create**
8. Copy the **Client ID** (you'll need this next)

### 5. Add Client ID to Your App

#### For Development (Local Testing)

1. Create a `.env.local` file in the `client` directory:
   ```bash
   cd /home/ubuntu/adult-content-manager/client
   echo "VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com" > .env.local
   ```

2. Replace `your-client-id-here` with your actual Client ID

3. Restart the development server:
   ```bash
   cd /home/ubuntu/adult-content-manager
   pnpm dev
   ```

#### For Production (Manus Deployment)

1. Go to your Manus project dashboard
2. Navigate to **Settings** → **Secrets** (or Environment Variables)
3. Add a new secret:
   - **Key**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: Your Client ID from Google Cloud Console
4. Save and redeploy your app

### 6. Test the Integration

1. Open your app
2. Go to **Media Library**
3. Click **Import from Google Photos**
4. Click **Connect Google Photos**
5. You should be redirected to Google's OAuth consent screen
6. Grant permissions
7. You'll be redirected back to your app with access to Google Photos

## Important Notes

### Publishing Your App

While your OAuth consent screen is in "Testing" mode:
- Only test users you added can access the app
- The consent screen will show a warning that the app is unverified

To remove these restrictions:
1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App**
3. Submit for verification (required for production use)

### Security Best Practices

- **Never commit** your Client ID to public repositories if it's sensitive
- Use environment variables for all credentials
- Rotate credentials if they're ever exposed
- Only request the minimum required scopes

### Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure your redirect URI in Google Cloud Console exactly matches your app's URL
- Include the trailing slash if your app uses it

**Error: "access_denied"**
- Check that you've added your Google account as a test user
- Verify the OAuth consent screen is properly configured

**Error: "invalid_client"**
- Double-check your Client ID is correct
- Ensure the Client ID environment variable is properly set

## Support

For more information, see:
- [Google Photos Library API Documentation](https://developers.google.com/photos/library/guides/get-started)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)

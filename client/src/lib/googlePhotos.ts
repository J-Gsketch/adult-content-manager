/**
 * Google Photos Integration
 * 
 * Provides seamless access to Google Photos library for mobile app
 */

const GOOGLE_PHOTOS_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.sharing',
];

export interface GooglePhotosConfig {
  clientId: string;
  redirectUri: string;
}

export interface GooglePhoto {
  id: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    width: string;
    height: string;
    creationTime: string;
  };
}

/**
 * Initialize Google Photos OAuth flow
 */
export function initGooglePhotosAuth(config: GooglePhotosConfig) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', GOOGLE_PHOTOS_SCOPES.join(' '));
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', 'google_photos_auth');

  window.location.href = authUrl.toString();
}

/**
 * Extract access token from OAuth redirect
 */
export function extractAccessToken(): string | null {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  
  if (accessToken) {
    // Store token securely
    sessionStorage.setItem('google_photos_token', accessToken);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  return accessToken;
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem('google_photos_token');
}

/**
 * Clear stored access token
 */
export function clearAccessToken() {
  sessionStorage.removeItem('google_photos_token');
}

/**
 * Fetch photos from Google Photos
 */
export async function fetchGooglePhotos(
  accessToken: string,
  pageSize: number = 50,
  pageToken?: string
): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
  const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems');
  url.searchParams.set('pageSize', pageSize.toString());
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
      throw new Error('Google Photos authentication expired. Please reconnect.');
    }
    throw new Error(`Failed to fetch Google Photos: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    photos: data.mediaItems || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Download photo from Google Photos
 */
export async function downloadGooglePhoto(photo: GooglePhoto): Promise<Blob> {
  // Google Photos requires appending =d to download
  const downloadUrl = `${photo.baseUrl}=d`;
  
  const response = await fetch(downloadUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download photo: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * Check if Google Photos is connected
 */
export function isGooglePhotosConnected(): boolean {
  return !!getAccessToken();
}

/**
 * Use Web Share Target API for receiving shared photos
 * This allows users to share photos from Google Photos directly to the app
 */
export function setupShareTarget() {
  // This is handled by the PWA manifest share_target configuration
  // When photos are shared to the app, they'll be sent to /upload endpoint
  console.log('Share target configured via PWA manifest');
}

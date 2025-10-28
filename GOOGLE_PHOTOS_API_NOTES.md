# Google Photos API Integration Notes

## API Endpoint
- Base URL: `https://photoslibrary.googleapis.com`
- List media items: `GET /v1/mediaItems`

## Authentication
- OAuth 2.0 required
- Scope needed: `https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata`
- Note: This scope only allows access to media items created by the app, not all user photos

## Important Limitation
**Critical:** The API scope `photoslibrary.readonly.appcreateddata` only provides access to media items that were created by YOUR app. This means:
- Cannot access existing photos in user's Google Photos library
- Can only access photos that were uploaded through this specific app
- This is a significant limitation for the use case

## Alternative Approach Needed
Since the standard Library API doesn't allow reading all user photos, we need to:
1. Use Google Photos Picker API (allows user to manually select photos)
2. Or guide users to download their photos using Google Takeout
3. Or implement a browser-based selection interface

## API Parameters
- `pageSize`: Max 100 items per request (default 25)
- `pageToken`: For pagination
- Response includes `nextPageToken` for fetching more items

## Implementation Strategy
Given the API limitations, the best approach is:
1. Provide instructions for users to use Google Takeout to download their photos
2. Implement local file upload functionality (already done)
3. Add a "Google Photos Picker" integration that lets users manually select photos
4. Store credentials for future uploads back to Google Photos (if needed)


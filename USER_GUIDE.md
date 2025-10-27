# Adult Content Manager - User Guide

## Overview

**Adult Content Manager** is a comprehensive web application designed to help content creators manage, organize, categorize, and monetize adult content across multiple platforms. The system integrates with photo galleries, uses AI-powered content analysis, and streamlines the upload process to various adult content platforms.

## Key Features

### 1. **Content Management**
- Upload and organize photos and videos
- AI-powered NSFW detection and content analysis
- Automatic categorization and tagging
- Duplicate detection to prevent redundant uploads
- Manual review and approval workflow

### 2. **Gallery Integration**
- Connect multiple photo galleries (Google Photos, Dropbox, OneDrive, Local files)
- Bulk import content from connected galleries
- Sync status monitoring

### 3. **Platform Integration**
- Configure multiple monetization platforms (OnlyFans, Fansly, ManyVids, etc.)
- Manage platform profiles and credentials
- Track platform status and connection health

### 4. **Upload Queue Management**
- Schedule content uploads to platforms
- Set custom titles, descriptions, and pricing
- Track upload status (pending, processing, completed, failed)
- Retry failed uploads

### 5. **Revenue Tracking**
- Record earnings from all platforms
- Track different transaction types (sales, subscriptions, tips)
- View revenue breakdown by platform
- Monitor total earnings and transaction history

## Getting Started

### Initial Setup

1. **Sign In**
   - Navigate to the application URL
   - Click "Sign In" to authenticate with your Manus account

2. **Configure Platforms**
   - Go to **Settings** → **Monetization Platforms** tab
   - Click "Add Platform"
   - Enter platform details:
     - Platform Name (e.g., "OnlyFans")
     - Platform Type
     - Handle/Username
     - Profile URL
     - Bio/Description
   - Click "Add Platform"

3. **Connect Photo Galleries** (Optional)
   - Go to **Settings** → **Photo Galleries** tab
   - Click "Add Gallery"
   - Select gallery type (Local, Google Photos, Dropbox, OneDrive)
   - Enter gallery name
   - For Google Photos: Follow the setup instructions to obtain API credentials

## Using the Application

### Dashboard

The dashboard provides an overview of your content library and monetization status:

- **Total Media**: Number of uploaded items and explicit content count
- **Approved Content**: Items ready for upload
- **Pending Review**: Items awaiting approval
- **Upload Queue**: Pending and completed uploads
- **Total Revenue**: All-time earnings
- **Active Platforms**: Connected monetization platforms

### Media Library

**Uploading Content:**

1. Click "Upload Media" button
2. Select an image or video file
3. Click "Upload"
4. The file will be uploaded to cloud storage and added to your library

**Managing Content:**

- **View**: Click the eye icon to see full-size preview and details
- **Approve**: Mark content as ready for upload
- **Mark Explicit**: Flag content as 18+ explicit material
- **AI Analysis**: Click "Analyze with AI" to automatically detect NSFW content and generate tags
- **Delete**: Remove unwanted content

**Filtering:**

- Use the search bar to find specific files
- Click "Explicit" to show only 18+ content
- Click "Approved" to show only approved items

### AI Content Analysis

The system includes built-in AI analysis for automatic content classification:

1. Select a media item in the Media Library
2. Click the menu (⋮) and select "Analyze with AI"
3. The AI will:
   - Assign an NSFW score (0-100)
   - Determine if content is explicit
   - Generate relevant tags
   - Provide a content description

**Note**: AI analysis results should be reviewed manually for accuracy.

### Categories and Tags

**Categories:**
- Navigate to **Categories** page
- Create hierarchical categories for organizing content
- Assign colors and icons for easy identification
- Link media items to categories

**Tags:**
- Navigate to **Tags** page
- Create custom tags for flexible content labeling
- Tags can be manual, AI-generated, or platform-specific
- Add multiple tags to each media item

### Upload Queue

**Adding Content to Queue:**

1. Go to **Upload Queue** page
2. Click "Add to Queue"
3. Select:
   - Media item (must be approved)
   - Target platform
   - Title (optional)
   - Description (optional)
   - Price in USD (optional)
4. Click "Add to Queue"

**Managing Queue:**

- View all items or filter by status (Pending, Completed, Failed)
- Monitor upload progress
- Delete pending or failed items
- Retry failed uploads manually

**Upload Status:**
- **Pending**: Waiting to be uploaded
- **Scheduled**: Set for future upload
- **Processing**: Currently uploading
- **Completed**: Successfully uploaded
- **Failed**: Upload encountered an error

### Revenue Tracking

**Recording Revenue:**

1. Go to **Revenue** page
2. Click "Add Revenue"
3. Enter:
   - Platform
   - Amount in USD
   - Transaction type (Sale, Subscription, Tip, Other)
   - Transaction date
   - Notes (optional)
4. Click "Add Revenue"

**Viewing Analytics:**

- **Total Revenue**: All-time earnings across platforms
- **Revenue by Platform**: Breakdown showing earnings per platform
- **Recent Transactions**: Latest revenue entries with details

## Google Photos Integration

### Setup Instructions

To connect your Google Photos account:

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Name it (e.g., "Adult Content Manager")

2. **Enable Google Photos API**
   - In your project, go to "APIs & Services" → "Library"
   - Search for "Photos Library API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the credentials JSON file

4. **Add to Application**
   - In Adult Content Manager, go to Settings → Photo Galleries
   - Click "Add Gallery"
   - Select "Google Photos"
   - Upload the credentials JSON file when prompted

**Important Notes:**
- You must manually set up API credentials due to security restrictions
- The application cannot access your Google Photos without your explicit authorization
- All processing happens securely in your account

## Platform-Specific Notes

### OnlyFans
- Requires manual upload through their web interface (API not publicly available)
- Use the upload queue to organize content and track what needs to be uploaded
- Record revenue manually after receiving payments

### Fansly
- Similar to OnlyFans, manual upload required
- Track scheduled posts in the upload queue
- Update status after manual upload

### ManyVids / Clips4Sale
- These platforms have seller APIs that may be integrated in future updates
- Currently use the queue for organization and manual upload tracking

### Custom Platforms
- Add any adult content platform not listed
- Use for tracking and organization purposes

## Best Practices

### Content Organization

1. **Use Consistent Naming**: Name files descriptively before upload
2. **Categorize Early**: Assign categories and tags as you upload
3. **Review AI Analysis**: Always verify AI-generated tags and classifications
4. **Approve Strategically**: Only approve content you're ready to monetize

### Monetization Strategy

1. **Diversify Platforms**: Don't rely on a single platform
2. **Track Everything**: Record all revenue for accurate analytics
3. **Price Strategically**: Use the pricing field in upload queue for consistency
4. **Schedule Content**: Use the upload queue to plan content releases

### Security & Privacy

1. **Keep Credentials Secure**: Never share platform credentials
2. **Regular Backups**: Export your data regularly (future feature)
3. **Review Permissions**: Check connected gallery permissions periodically
4. **Use Strong Passwords**: Ensure your Manus account has a strong password

## Troubleshooting

### Upload Issues

**Problem**: File upload fails
- **Solution**: Check file size (large files may take longer)
- **Solution**: Verify file format is supported (images: JPG, PNG, GIF; videos: MP4, MOV)
- **Solution**: Check internet connection

**Problem**: Duplicate file detected
- **Solution**: The system automatically detects duplicates by file hash
- **Solution**: If you need to upload the same file, modify it slightly first

### Gallery Connection Issues

**Problem**: Google Photos sync fails
- **Solution**: Verify API credentials are correct
- **Solution**: Check that Photos Library API is enabled in Google Cloud Console
- **Solution**: Ensure OAuth consent screen is configured

### AI Analysis Issues

**Problem**: AI analysis fails
- **Solution**: Ensure the image is accessible (not corrupted)
- **Solution**: Try again later if service is temporarily unavailable
- **Solution**: Manually classify content if AI continues to fail

## Data Management

### Exporting Data

Currently, all data is stored securely in the cloud database. Future updates will include:
- Export media library to CSV
- Download all media files as ZIP
- Export revenue reports

### Deleting Data

- **Media Items**: Delete from Media Library (permanently removes from storage)
- **Galleries**: Delete from Settings (does not affect original gallery)
- **Platforms**: Delete from Settings (does not affect platform account)
- **Revenue Records**: Cannot be deleted (for accounting integrity)

## Support & Feedback

For technical support, feature requests, or bug reports:
- Visit: [https://help.manus.im](https://help.manus.im)
- Submit a support ticket with detailed information

## Privacy & Terms

- All content is stored securely with encryption
- Only you have access to your content and data
- Platform credentials are encrypted in the database
- The application does not share your content with third parties
- AI analysis is performed securely and privately

## Future Features (Roadmap)

Planned enhancements include:
- Automated platform uploads via API (where available)
- Bulk editing and batch operations
- Advanced analytics and performance metrics
- Content calendar and scheduling
- Watermarking and image editing tools
- Mobile app for on-the-go management
- Integration with payment processors
- Automated revenue import from platforms

---

**Version**: 1.0  
**Last Updated**: 2025

For the latest updates and documentation, visit the application dashboard.


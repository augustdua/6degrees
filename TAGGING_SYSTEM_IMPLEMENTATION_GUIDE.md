# Tagging System Implementation Guide

## Overview

A comprehensive tagging system has been implemented for Requests and Offers with:
- **AI-powered auto-tagging** using OpenAI GPT-3.5-turbo
- **Manual tag editing** capabilities
- **Tag-based filtering and search**
- **Demo data** for testing with 200+ predefined tags
- **Modern UI components** including animated keyword banners and category sections

## ✅ Completed Implementation

### Database Layer

**File: `supabase/migrations/081_add_tagging_system.sql`**

- ✅ Created `tags` table with 200+ predefined tags (AI, Fundraising, Fashion, Crypto, etc.)
- ✅ Added `tags` JSONB column to `connection_requests` table
- ✅ Added `tags` JSONB column to `offers` table
- ✅ Added `is_demo` BOOLEAN columns for fake data management
- ✅ Created GIN indexes for fast tag queries
- ✅ Created helper functions:
  - `get_popular_tags()` - Returns most used tags
  - `search_requests_by_tags()` - Filter requests by tags
  - `search_offers_by_tags()` - Filter offers by tags
- ✅ Set up RLS policies for tags table

### Backend Layer

**Files Created/Modified:**

1. **`backend/src/services/taggingService.ts`** ✅
   - `autoTagContent()` - AI-powered tagging using OpenAI
   - `getAllTags()` - Fetch all available tags with caching
   - `getPopularTags()` - Get most frequently used tags
   - `keywordBasedTagging()` - Fallback keyword matching
   - `updateTagUsage()` - Track tag usage statistics

2. **`backend/src/routes/tags.ts`** ✅
   - `GET /api/tags` - Retrieve all available tags
   - `GET /api/tags/popular` - Get popular tags with counts

3. **`backend/src/controllers/offerController.ts`** ✅
   - Modified `createOffer()` to auto-tag offers
   - Updated `getOffers()` to support tag filtering via `?tags=tag1,tag2`
   - Added demo data filtering via `?include_demo=true/false`
   - Created `updateOfferTags()` endpoint

4. **`backend/src/controllers/requestController.ts`** ✅
   - Modified `createRequest()` to auto-tag requests
   - Created `updateRequestTags()` endpoint

5. **`backend/src/routes/offers.ts`** ✅
   - Added `PATCH /api/offers/:id/tags` route

6. **`backend/src/routes/requests.ts`** ✅
   - Added `PATCH /api/requests/:requestId/tags` route

7. **`backend/src/server.ts`** ✅
   - Wired up tags routes

8. **`backend/package.json`** ✅
   - Added `seed:demo` npm script

### Demo Data

**File: `backend/src/scripts/seedDemoOffersRequests.ts`** ✅

- 30+ demo offers across categories (AI, Fundraising, Fashion, E-Commerce, SaaS, etc.)
- 25+ demo requests across categories
- Each item properly tagged and marked with `is_demo: true`
- Realistic titles, descriptions, and pricing

**To run:** `npm run seed:demo` (from backend directory)

### Frontend Layer

**Files Created:**

1. **`frontend/src/hooks/useTags.ts`** ✅
   - Hook for managing tags
   - `fetchAllTags()` - Load all available tags
   - `fetchPopularTags()` - Load popular tags
   - Auto-loads tags on mount

2. **`frontend/src/hooks/useOffers.ts`** ✅
   - Updated `Offer` interface to include `tags` and `is_demo`
   - Modified `getOffers()` to support tag filtering
   - Added `updateOfferTags()` method
   - Auto-parses tags from JSON

3. **`frontend/src/hooks/useRequests.ts`** ✅
   - Updated `ConnectionRequest` interface to include `tags` and `is_demo`

4. **`frontend/src/components/AnimatedKeywordBanner.tsx`** ✅
   - Displays rotating keywords with smooth animation
   - Clickable keywords for filtering
   - Configurable interval and keyword list

5. **`frontend/src/components/TagSearchBar.tsx`** ✅
   - Search input with tag autocomplete
   - Shows selected tags as removable chips
   - Keyboard navigation support
   - Click-outside detection

6. **`frontend/src/components/CategorySection.tsx`** ✅
   - Horizontal scrollable category layout (like Intro.co)
   - Left/Right scroll buttons
   - "View All" button for category expansion
   - Item count display

7. **`frontend/src/components/TagSelector.tsx`** ✅
   - Multi-select tag picker for forms
   - Shows AI-suggested tags prominently
   - Browse all tags in modal
   - Popular tags section
   - Search functionality
   - Max tags limit (default 7)

## 🚧 Integration Needed

### Update Feed.tsx for Offers Tab

The components are ready but need to be integrated into `frontend/src/pages/Feed.tsx`. Here's how:

#### 1. Add Imports

```typescript
import { AnimatedKeywordBanner } from '@/components/AnimatedKeywordBanner';
import { TagSearchBar } from '@/components/TagSearchBar';
import { CategorySection } from '@/components/CategorySection';
import { useTags } from '@/hooks/useTags';
```

#### 2. Add State for Tag Filtering

```typescript
const [selectedOfferTags, setSelectedOfferTags] = useState<string[]>([]);
const [selectedRequestTags, setSelectedRequestTags] = useState<string[]>([]);
const { popularTags } = useTags();
```

#### 3. Update Offers Loading with Tags

```typescript
const loadMarketplaceOffers = async (tags?: string[]) => {
  setOffersLoading(true);
  try {
    const data = await getOffers({ 
      status: 'active', 
      limit: 100,
      tags: tags || selectedOfferTags,
      include_demo: true // Show demo data in development
    });
    setOffers(data || []);
  } catch (error) {
    console.error('Error loading marketplace offers:', error);
    toast({
      title: 'Error',
      description: 'Failed to load marketplace offers',
      variant: 'destructive'
    });
  } finally {
    setOffersLoading(false);
  }
};
```

#### 4. Group Offers by Category

```typescript
// Group offers by primary tag
const groupOffersByTag = (offers: Offer[]) => {
  const grouped: Record<string, Offer[]> = {};
  
  offers.forEach(offer => {
    const primaryTag = offer.tags?.[0] || 'Other';
    if (!grouped[primaryTag]) {
      grouped[primaryTag] = [];
    }
    grouped[primaryTag].push(offer);
  });
  
  return grouped;
};

const groupedOffers = groupOffersByTag(offers);
```

#### 5. Replace Offers Tab Content

```typescript
<TabsContent value="bids" className="mt-6">
  <div className="max-w-7xl mx-auto px-4">
    {/* Animated Keyword Banner */}
    <AnimatedKeywordBanner
      keywords={popularTags.map(t => t.name).slice(0, 15)}
      onKeywordClick={(keyword) => {
        setSelectedOfferTags([keyword]);
        loadMarketplaceOffers([keyword]);
      }}
      interval={3000}
    />

    {/* Tag Search Bar */}
    <TagSearchBar
      selectedTags={selectedOfferTags}
      onTagsChange={(tags) => {
        setSelectedOfferTags(tags);
        loadMarketplaceOffers(tags);
      }}
      placeholder="Search offers by tags..."
    />

    {/* Offers by Category */}
    {offersLoading ? (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading offers...</p>
      </div>
    ) : Object.keys(groupedOffers).length > 0 ? (
      <div>
        {Object.entries(groupedOffers).map(([category, categoryOffers]) => (
          <CategorySection
            key={category}
            categoryName={category}
            itemCount={categoryOffers.length}
            onViewAll={() => {
              // Open modal or navigate to category page
              setSelectedOfferTags([category]);
              loadMarketplaceOffers([category]);
            }}
          >
            {categoryOffers.map((offer) => (
              <Card
                key={offer.id}
                className="flex-shrink-0 w-80 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedOfferForDetails(offer);
                  setShowOfferDetailsModal(true);
                }}
              >
                {/* Your existing offer card content */}
                {/* ... */}
              </Card>
            ))}
          </CategorySection>
        ))}
      </div>
    ) : (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No offers found matching your criteria.</p>
      </div>
    )}
  </div>
</TabsContent>
```

### Similar Changes for Requests Tab

Apply the same pattern to the requests tab:

1. Add `AnimatedKeywordBanner` with popular tags
2. Add `TagSearchBar` for filtering
3. Group requests by primary tag
4. Render categories with `CategorySection` horizontal scroll

### Update Create Offer/Request Forms

In your create forms, add the `TagSelector` component:

```typescript
import { TagSelector } from '@/components/TagSelector';

// In your form:
<TagSelector
  selectedTags={formData.tags || []}
  onTagsChange={(tags) => setFormData({ ...formData, tags })}
  autoSuggestedTags={aiSuggestedTags} // From API response
  maxTags={7}
/>
```

## API Endpoints

### Tags

- `GET /api/tags` - Get all available tags
- `GET /api/tags/popular?limit=20` - Get popular tags

### Offers

- `GET /api/offers?tags=AI,Fundraising&include_demo=true` - Filter by tags
- `PATCH /api/offers/:id/tags` - Update offer tags
  ```json
  { "tags": ["AI", "Startups", "CTO"] }
  ```

### Requests

- `PATCH /api/requests/:id/tags` - Update request tags
  ```json
  { "tags": ["Fundraising", "VC"] }
  ```

## Testing

### 1. Run Database Migration

```bash
# Apply migration to Supabase
psql "your-connection-string" -f supabase/migrations/081_add_tagging_system.sql
```

### 2. Seed Demo Data

```bash
cd backend
npm run seed:demo
```

### 3. Test API Endpoints

```bash
# Get all tags
curl http://localhost:3001/api/tags

# Get popular tags
curl http://localhost:3001/api/tags/popular?limit=10

# Get offers with tags
curl http://localhost:3001/api/offers?tags=AI,Fundraising
```

### 4. Test Auto-Tagging

Create a new offer or request and verify that tags are automatically assigned based on the content.

## Environment Variables

Make sure `OPENAI_API_KEY` is set in your backend `.env` file:

```env
OPENAI_API_KEY=sk-...
```

If not set, auto-tagging will fall back to keyword matching.

## Performance Considerations

- Tags are cached in memory for 1 hour
- GIN indexes on JSONB columns for fast tag queries
- Limit popular tags queries to reasonable numbers (20-50)
- Consider adding Redis caching for production

## Next Steps

1. ✅ Database migration
2. ✅ Backend implementation
3. ✅ Frontend components
4. 🚧 Integrate components into Feed.tsx
5. ⏳ Add tag selector to create/edit forms
6. ⏳ Test with real data
7. ⏳ Deploy to production

## Troubleshooting

### Tags not showing up?

- Check that migration ran successfully
- Verify tags exist: `SELECT * FROM tags LIMIT 10;`
- Check browser console for API errors

### Auto-tagging not working?

- Verify `OPENAI_API_KEY` is set
- Check backend logs for OpenAI errors
- System will fall back to keyword matching if API fails

### Demo data not appearing?

- Run `npm run seed:demo` from backend directory
- Check `is_demo` flag: `SELECT * FROM offers WHERE is_demo = true;`
- Verify `include_demo=true` in API calls

## Support

For issues or questions, check the implementation files for inline documentation.


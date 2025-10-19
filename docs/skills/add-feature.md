# Add Feature Skill

Template for adding new features to the Film app using established patterns.

## Standard Feature Development Flow

### 1. Database Layer

Edit `prisma/schema.prisma`:

```prisma
model NewFeature {
  id         Int      @id @default(autoincrement())
  user_id    Int      @default(1)
  name       String
  description String?
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("new_features")
}
```

**Run migration:**
```bash
npx prisma migrate dev --name add_new_feature
npx prisma generate
```

**→ For detailed migration workflow, see [database-migration.md](./database-migration.md)**

---

### 2. Type Definitions

Create types in `src/types/newfeature.ts`:

```typescript
// API types
export interface NewFeature {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NewFeatureCreate {
  name: string;
  description?: string;
}

export interface NewFeatureUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// API response types
export interface NewFeatureResponse {
  success: boolean;
  data?: NewFeature;
  error?: string;
}

export interface NewFeaturesListResponse {
  success: boolean;
  data?: {
    features: NewFeature[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
  error?: string;
}
```

---

### 3. API Layer

Create `src/app/api/newfeature/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List features
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [features, total] = await Promise.all([
      prisma.newFeature.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.newFeature.count()
    ]);

    return Response.json({
      success: true,
      data: {
        features,
        pagination: {
          total,
          page,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

// POST - Create feature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const feature = await prisma.newFeature.create({
      data: {
        name: body.name,
        description: body.description
      }
    });

    return Response.json({
      success: true,
      data: feature
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    return Response.json(
      { success: false, error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}
```

**Follow patterns from:**
- Movies API (`src/app/api/movies/route.ts`) - Complex filtering & sorting
- Watchlist API (`src/app/api/watchlist/route.ts`) - Simple CRUD
- Tags API (`src/app/api/tags/route.ts`) - Minimal endpoints

---

### 4. Component Layer

Create components in `src/components/newfeature/`:

**FeatureCard.tsx**
```typescript
'use client';

import { NewFeature } from '@/types/newfeature';

interface FeatureCardProps {
  feature: NewFeature;
  onSelect?: (feature: NewFeature) => void;
}

export function FeatureCard({ feature, onSelect }: FeatureCardProps) {
  return (
    <div
      className="bg-card rounded-lg p-4 hover:bg-card/80 cursor-pointer transition"
      onClick={() => onSelect?.(feature)}
    >
      <h3 className="text-lg font-semibold">{feature.name}</h3>
      {feature.description && (
        <p className="text-sm text-muted-foreground mt-1">
          {feature.description}
        </p>
      )}
    </div>
  );
}
```

**FeatureModal.tsx**
```typescript
'use client';

import { useState } from 'react';
import { NewFeature } from '@/types/newfeature';

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: NewFeature;
}

export function FeatureModal({ isOpen, onClose, feature }: FeatureModalProps) {
  const [name, setName] = useState(feature?.name || '');
  const [description, setDescription] = useState(feature?.description || '');

  const handleSave = async () => {
    // Save logic here
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      {/* Modal content */}
    </div>
  );
}
```

**FeatureGrid.tsx**
```typescript
'use client';

import { NewFeature } from '@/types/newfeature';
import { FeatureCard } from './FeatureCard';

interface FeatureGridProps {
  features: NewFeature[];
  onSelect?: (feature: NewFeature) => void;
}

export function FeatureGrid({ features, onSelect }: FeatureGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map(feature => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
```

---

### 5. Page Layer

Create page in `src/app/newfeature/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { NewFeature } from '@/types/newfeature';
import { FeatureGrid } from '@/components/newfeature/FeatureGrid';
import { FeatureModal } from '@/components/newfeature/FeatureModal';

export default function NewFeaturePage() {
  const [features, setFeatures] = useState<NewFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/newfeature');
      const data = await response.json();
      if (data.success) {
        setFeatures(data.data.features);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">New Features</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Add Feature
        </button>
      </div>

      <FeatureGrid features={features} />

      <FeatureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

---

### 6. Integration

**Update Navigation** (`src/components/layout/Navigation.tsx`):
```typescript
<Link href="/newfeature">New Features</Link>
```

**Add links in relevant pages:**
- Homepage link
- Settings menu
- Related feature pages

**Update documentation:**
- Add to QUICK-START.md features list
- Document API endpoints in architecture.md
- Add workflow to process.md if complex

---

## Examples of Existing Features

### Watchlist Feature (Good Reference)
**Location:** `/watchlist`, `src/components/watchlist/`, `/api/watchlist`

**Pattern:**
- Separate database table (WatchlistMovie, WatchlistTag)
- TMDB integration for adding movies
- Tag-based filtering
- Modal for adding items
- Grid layout matching main collection

**→ See [architecture.md § Watchlist](../architecture.md#watchlist-feature-october-2024)**

### Buddy System (Tag-Based Pattern)
**Location:** `/buddy/calen`, `src/components/movie/AddToCalenModal.tsx`

**Pattern:**
- Reuses existing Tag infrastructure
- Filtering by tag_id
- Modal for adding movies to tag
- Year counts with tag filtering

**→ See [architecture.md § Tag-Based Collection System](../architecture.md#tag-based-collection-system-december-2024)**

### Oscar Pages (Complex Data)
**Location:** `/oscars`, `/oscars/[year]`, `/api/oscars`

**Pattern:**
- Unified architecture with 3 tables
- Category filtering
- Year navigation
- TMDB integration for non-collection movies
- Grayscale styling for visual distinction

**→ See [oscars.md](../oscars.md)**

---

## Checklist

- [ ] Database schema created and migrated
- [ ] TypeScript types defined
- [ ] API endpoints implemented (GET, POST, PUT, DELETE as needed)
- [ ] Components created (Card, Grid, Modal)
- [ ] Page created with routing
- [ ] Navigation updated
- [ ] Documentation updated
- [ ] Tested locally
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsive design verified

---

## Related Documentation

- **Database Migrations:** [database-migration.md](./database-migration.md)
- **TMDB Integration:** [tmdb-integration.md](./tmdb-integration.md)
- **Architecture:** [../architecture.md](../architecture.md)
- **Quick Start:** [../session-start/QUICK-START.md](../session-start/QUICK-START.md)

#!/bin/bash

# Fix all Next.js 15 route parameter issues
echo "Fixing Next.js 15 route parameter types..."

# Fix oscars/years/[year]/route.ts
sed -i '' 's/{ params }: { params: { year: string } }/{ params }: { params: Promise<{ year: string }> }/g' src/app/api/oscars/years/[year]/route.ts

# Fix oscars/best-picture/[id]/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/oscars/best-picture/[id]/route.ts

# Fix tmdb/movie/[id]/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/tmdb/movie/[id]/route.ts

# Fix movies/[id]/remove/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/movies/[id]/remove/route.ts

# Fix movies/[id]/tags/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/movies/[id]/tags/route.ts

# Fix movies/[id]/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/movies/[id]/route.ts

# Fix movies/[id]/update-tmdb/route.ts
sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' src/app/api/movies/[id]/update-tmdb/route.ts

echo "Route parameter types fixed!"
import { Film, Sparkles, Award, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-primary/10 rounded-full backdrop-blur-sm border border-primary/20">
                <Film className="w-16 h-16 text-primary" />
              </div>
            </div>

            <h1 className="text-6xl font-heading font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Film Collection
            </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Your personal movie tracking experience with a premium streaming service interface.
              Track 3000+ movies, Oscar wins, and watch buddy experiences.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <div className="flex items-center gap-2 px-6 py-3 bg-card/50 backdrop-blur-sm rounded-full border border-border">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">30 Movies</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 bg-card/50 backdrop-blur-sm rounded-full border border-border">
                <Award className="w-5 h-5 text-cinema-gold" />
                <span className="text-sm font-medium">Oscar Tracking</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 bg-card/50 backdrop-blur-sm rounded-full border border-border">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium">Buddy System</span>
              </div>
            </div>

            <div className="flex justify-center">
              <a
                href="/movies"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
              >
                <Film className="w-6 h-6" />
                View My Collection
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-semibold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground">Premium features in development</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="group p-6 bg-card/30 backdrop-blur-sm rounded-lg border border-border hover:border-primary/50 transition-all duration-300">
            <div className="mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Film className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Movie Grid</h3>
              <p className="text-muted-foreground">Visual poster grid with advanced filtering and search capabilities</p>
            </div>
          </div>

          <div className="group p-6 bg-card/30 backdrop-blur-sm rounded-lg border border-border hover:border-accent/50 transition-all duration-300">
            <div className="mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Oscar Hub</h3>
              <p className="text-muted-foreground">Dedicated pages for Academy Award nominees and winners by year</p>
            </div>
          </div>

          <div className="group p-6 bg-card/30 backdrop-blur-sm rounded-lg border border-border hover:border-blue-400/50 transition-all duration-300">
            <div className="mb-4">
              <div className="w-12 h-12 bg-blue-400/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Buddy Pages</h3>
              <p className="text-muted-foreground">Special pages for movies watched with Calen and other companions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted-foreground">
            <p>Film Collection - Personal Movie Tracking Experience</p>
            <p className="text-sm mt-2">Built with Next.js, Tailwind CSS, and TMDB API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

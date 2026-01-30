import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles, GraduationCap, ArrowRight } from 'lucide-react';

export default function Index() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/bookshelf');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />

      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-24 h-24 rounded-full bg-primary/10 animate-float" />
        <div className="absolute top-40 right-[15%] w-32 h-32 rounded-full bg-accent/10 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[20%] w-20 h-20 rounded-full bg-secondary/10 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-[25%] w-28 h-28 rounded-full bg-success/10 animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Floating books */}
        <div className="absolute top-32 left-[5%] transform rotate-12 opacity-20">
          <BookOpen className="w-16 h-16 text-primary" />
        </div>
        <div className="absolute bottom-32 right-[5%] transform -rotate-12 opacity-20">
          <BookOpen className="w-20 h-20 text-accent" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 md:p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-playful">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-gradient">EduFlip</h1>
              <p className="text-sm text-muted-foreground">Library</p>
            </div>
          </div>

          <Button
            onClick={() => navigate('/auth')}
            className="gradient-primary text-primary-foreground shadow-playful"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </header>

        {/* Hero section */}
        <main className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            strokeWidth="4"
            strokeLinecap="round"
                  />
          </svg>
        </span>
        <span className="text-accent"> ✨</span>
      </h1>

      <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
        Discover beautiful 3D flipbooks with realistic page-turning animations,
        perfectly matched to your grade level.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          size="lg"
          onClick={() => navigate('/auth')}
          className="gradient-primary text-primary-foreground shadow-playful text-lg px-8 py-6"
        >
          <BookOpen className="w-5 h-5 mr-2" />
          Start Reading
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate('/auth')}
          className="text-lg px-8 py-6"
        >
          <GraduationCap className="w-5 h-5 mr-2" />
          I'm an Admin
        </Button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        {[
          {
            icon: '📚',
            title: 'Grade-Level Books',
            description: 'Content perfectly matched to your learning level',
          },
          {
            icon: '🎨',
            title: '3D Page Flipping',
            description: 'Realistic animations that make reading fun',
          },
          {
            icon: '📊',
            title: 'Track Progress',
            description: 'Pick up where you left off, every time',
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card shadow-card hover:shadow-playful transition-shadow"
          >
            <div className="text-4xl mb-3">{feature.icon}</div>
            <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
        </main >
      </div >
    </div >
  );
}

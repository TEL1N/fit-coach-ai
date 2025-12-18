# TailorFit - AI-Powered Fitness Coach

A modern mobile-first fitness application that generates personalized workout plans through intelligent AI conversation.

## 🎯 Features

- **AI Conversation**: Chat with Claude AI to discuss fitness goals, experience level, and available equipment
- **Personalized Plans**: Automatically generated workout programs tailored to your profile
- **Progress Tracking**: Track completed exercises and maintain workout streaks
- **Mobile-First Design**: Premium dark mode UI optimized for iOS and Android
- **Real-time Updates**: Instant plan modifications through AI chat

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI**: Claude 3.5 Sonnet via Anthropic API
- **State Management**: React Context API
- **Routing**: React Router v6

## 🏗️ Architecture

### Frontend
- `/src/pages` - Main application pages (Auth, Onboarding, Chat, Workouts, Profile)
- `/src/components` - Reusable UI components
- `/src/contexts` - Global state management (ChatContext, WorkoutPlanContext)
- `/src/lib` - Utility functions and service integrations
- `/src/integrations/supabase` - Auto-generated Supabase client and types

### Backend (Supabase)
- `/supabase/functions` - Edge Functions for AI integration
  - `chat-with-claude` - Conversational AI interface
  - `generate-workout-plan` - Automated plan generation
- `/supabase/migrations` - Database schema and RLS policies

### Database Schema
- `user_fitness_profiles` - User onboarding data (goals, experience, equipment)
- `conversations` - Chat history
- `messages` - Individual chat messages
- `workout_plans` - Generated workout programs
- `workout_days` - Days within a plan
- `workout_exercises` - Individual exercises with sets/reps
- `exercises` - Exercise library (synced from WGER API)
- `exercise_logs` - Completed workout tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Supabase account
- Anthropic API key

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/tailorfit.git
   cd tailorfit
```

2. **Install dependencies**
```bash
   npm install
   # or
   bun install
```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
```env
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
```

4. **Set up Supabase**
```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push

   # Deploy edge functions
   supabase functions deploy chat-with-claude
   supabase functions deploy generate-workout-plan
```

5. **Start development server**
```bash
   npm run dev
   # or
   bun dev
```

   Open [http://localhost:8080](http://localhost:8080)

## 📱 Key Features Implementation

### AI Workout Generation
The app uses Claude 3.5 Sonnet to generate personalized workout plans based on:
- Fitness goals (muscle building, weight loss, endurance, etc.)
- Experience level (beginner to advanced)
- Available equipment
- Workout frequency
- Injuries/limitations

Plans are goal-specific with appropriate rep ranges, rest periods, and exercise selection.

### Real-time Chat
Conversational UI powered by Claude AI allows users to:
- Ask fitness questions
- Request plan modifications
- Get exercise alternatives
- Receive motivation and tips

### Progressive Enhancement
- Mobile-first responsive design
- iOS safe area insets for notch/Dynamic Island
- Haptic feedback for interactions
- Smooth animations with Framer Motion
- Loading states and skeleton screens

## 🔐 Security

- Row Level Security (RLS) policies on all tables
- JWT-based authentication via Supabase Auth
- API keys never exposed to client
- Environment variables properly configured
- Secure edge functions with JWT verification

## 📈 Performance Optimizations

- Aggressive caching of workout plans in context
- Batch database queries (e.g., fetching plans with nested days/exercises)
- Debounced API calls
- Lazy loading of components
- Optimized re-renders with React.memo

## 🧪 Exercise Matching System

The app includes a fuzzy matching system for linking AI-generated exercise names to a comprehensive exercise database:
- Uses Fuse.js for fuzzy string matching
- Syncs with WGER Exercise API
- Confidence scoring for matches
- Alias caching for performance
- Fallback to exercise name storage

## 📝 License

MIT License - feel free to use this project for learning or personal use.

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## ⚠️ Disclaimer

This application provides fitness guidance through AI but is not a substitute for professional medical or fitness advice. Always consult healthcare providers before starting new exercise programs.
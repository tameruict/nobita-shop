# Nobita AI Web Application

This project is a React-based front-end application transformed from a set of static HTML templates, using Vite, Tailwind CSS, React Browser Router, custom Google Fonts and Material Symbols, i18next for localization, and prepared for a Supabase backend integration.

## Features Completed
1. **Frontend Architecture**: Clean, component-based folder structure using React 18.
2. **Global Styling**: Integrated Tailwind CSS with custom glassmorphism (`.glass`, `.glass-panel`) and cyberpunk neon effects directly into `tailwind.config.js` and `index.css`.
3. **i18n Support**: Configured `react-i18next` with English (default) and Vietnamese language localization files.
4. **Pages Implemented**:
    - **Home**: Dynamic landing page with hero header and responsive pricing cards.
    - **Login**: Standalone Cyber Login page featuring secure mock fields and layout structure matching original specs.
    - **Admin Dashboard**: Revenue tracking page displaying interactive line charts (via `recharts`) and dynamic total revenue numbers based on sample data.
    - **Admin Users Management**: Interactive user management view enabling admins to search, edit roles, filter inactive/active states, and theoretically assign user roles.
5. **Backend Readiness**: Includes initialized `@supabase/supabase-js` client in `src/lib/supabase.js`.

## Local Setup Instructions

1. **Install Prerequisites**: Ensure you have Node.js (v18+) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Supabase credentials to link with a real DB (optional, mock data is used by default for the demo):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
5. **Open Browser**:
   Navigate to `http://localhost:5173`. 
   
## Available Routes
- `/` - Main Landing Page
- `/login` - Auth Entry Point
- `/admin` - Admin Revenue Dashboard
- `/admin/users` - Admin User Management

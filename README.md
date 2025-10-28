# Expense-Splitting-Application
Final project for COMPSCI 520

## Switch to the latest code
Make sure you are on the main branch where the latest changes are present:

git checkout main

git pull origin main

## Install dependencies
Install the required packages using npm:

npm install svix

npm install recharts

npm install

## Set up environment variables
Create a .env file in the root directory of the project and add the following variables:

Deployment used by `npx convex dev`

CONVEX_DEPLOYMENT=

NEXT_PUBLIC_CONVEX_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

CLERK_JWT_ISSUER_DOMAIN=

## Run the development servers
Open two terminals:

Terminal 1: Start the Next.js development server

npm run dev

Terminal 2: Start the Convex backend server

npx convex dev

## Access the application
Open your browser and navigate to http://localhost:3000 to use the application.


# Build stage
FROM node:24-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create a temporary tsconfig for build
RUN echo '{ \
  "extends": "./tsconfig.json", \
  "compilerOptions": { \
    "noUnusedLocals": false, \
    "noUnusedParameters": false \
  } \
}' > tsconfig.build.json

# Create vite config for build
RUN echo 'import { defineConfig } from "vite"; \
import react from "@vitejs/plugin-react"; \
\
export default defineConfig({ \
  plugins: [react()], \
  build: { \
    rollupOptions: { \
      onwarn(warning, warn) { \
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return; \
        warn(warning); \
      }, \
    }, \
  }, \
  resolve: { \
    alias: { \
      "@": "/src" \
    } \
  }, \
  css: { \
    modules: { \
      localsConvention: "camelCase" \
    } \
  } \
});' > vite.config.ts

# Ensure CSS directory exists
RUN mkdir -p src/css

# Build application with modified tsconfig
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 
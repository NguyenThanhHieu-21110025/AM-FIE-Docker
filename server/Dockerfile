FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set environment variables for bcrypt
ENV NODE_ENV=production
ENV npm_config_build_from_source=true

# Copy package files
COPY package*.json ./

# Install dependencies with specific platform
RUN npm install --platform=linux --arch=x64

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8080

CMD ["npm", "start"] 
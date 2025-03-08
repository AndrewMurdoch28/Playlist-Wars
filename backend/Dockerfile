# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json & install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the rest of the backend files
COPY . .

# Expose the port (must match the one in your app)
EXPOSE 3001

# Start the backend
CMD ["node", "dist/index.js"]

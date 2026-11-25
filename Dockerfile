# A lightweight Node.js image based on Debian (handles native modules well)
FROM node:20-slim

# working directory inside the container
WORKDIR /app

# Copy package files first (this caches the npm install step)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application files
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
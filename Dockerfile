# 1. Use Node 22 (better-sqlite3 requires >= 22)
FROM node:22-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install the system dependencies required to compile better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy package files first (this caches the npm install step)
COPY package*.json ./

# 5. Install Node dependencies
RUN npm install

# 6. Copy the rest of your application files
COPY . .

# 7. Expose the port your app runs on
EXPOSE 3000

# 8. Start the application
CMD ["node", "app.js"]
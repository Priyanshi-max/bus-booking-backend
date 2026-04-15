# Use official Node image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose port (Back4App uses 3000)
EXPOSE 3000

# Start app
CMD ["npm", "start"]
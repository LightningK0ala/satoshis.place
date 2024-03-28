# Ubuntu + Node.js
FROM node:8.11.2

# Create app directory and set as working directory
RUN mkdir -p /app
WORKDIR /app

# Add lock file and package.json
ADD package.json ./

# Install dependencies
RUN npm i

# Copy app source
ADD . /app

# Run app
ENTRYPOINT ["npm", "start"]

# Ubuntu + Node.js
FROM node:8.11.2

# Create app directory and set as working directory
RUN mkdir -p /app
WORKDIR /app

# Add lock file and package.json
ADD yarn.lock package.json ./

# Install dependencies
RUN yarn

# Copy app source
ADD . /app

# Run app
ENTRYPOINT ["npm", "start"]

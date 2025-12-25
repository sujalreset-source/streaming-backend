# ✅ Use official Node.js Alpine base image
# FROM node:18-alpine
FROM --platform=linux/amd64 node:18-alpine

# ✅ Set working directory inside container
WORKDIR /app

# ✅ Copy package files and install dependencies
COPY ./package*.json ./
RUN npm install

# ✅ Copy all project files into the container
COPY . ./

# ✅ Expose the port your app runs on
EXPOSE 4000

# ✅ Start the Node.js app
CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app

COPY package-lock.json ./ 
RUN npm install

COPY . . # Copy all client files

# For development (Hot-reloading)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# For production (build and serve with Nginx or similar)
# RUN npm run build
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"] # Example with Nginx for static serving
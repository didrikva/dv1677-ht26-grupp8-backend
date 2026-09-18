# Basimage — Node 22 på Alpine Linux (liten och säker)
FROM node:22-alpine

# Arbetsmapp inuti containern — alla filer hamnar här
WORKDIR /app

# Kopiera bara package-filer först (utnyttjar Docker-cache effektivt)
COPY package*.json ./

# Installera beroenden exakt enligt package-lock.json (reproducerbart bygge).
# --omit=dev utesluter devDependencies (t.ex. nodemon, testbibliotek) — de behövs
# inte i produktion och gör imagen onödigt stor.
# OBS: npm ci kräver att package-lock.json finns i repot — ta bort den från .gitignore om den ligger där.
RUN npm ci --omit=dev

# Kopiera resten av källkoden
COPY . .

# Dokumenterar vilken port appen lyssnar på (kopplas i docker-compose.yml)
EXPOSE 3000

# Kommandot som körs när containern startar
CMD ["node", "app.js"]